# ML Implementation Plan for AI Insights

## 1. Product context from the current frontend

The active frontend already defines the first set of AI/ML use cases:

- Home tab: total balance, account cards, weekly spending chart, recent transactions.
- Insights tab: period selector, category spending chart, "highest expense" card, category breakdown list.
- Budget tab: total monthly limit, spent vs remaining, per-category budget progress.
- Add Transaction modal: amount, type, category, account, note, date, and a placeholder voice-input flow.
- Account and category management screens: enough metadata to support personalization and feature engineering.

This means the ML work should not start from "generic AI insights." It should start from the specific UI moments that need predictions, rankings, or explanations.

## 2. Target AI features mapped to the UI

### Home tab

- Spend pace alert: "You are spending 18% faster than last month."
- Cash runway alert: "At current pace, wallet balance covers 11 more days."
- Category shift alert: "Transport spend is unusually high this week."
- Smart recent-activity tags: recurring, unusual, larger-than-normal.

### Insights tab

- Top category drivers with explanation.
- Category trend forecasting for selected period.
- Recurring expense detection.
- Anomaly detection for unusual transactions.
- "What changed?" summary comparing current period vs previous period.

### Budget tab

- Budget overrun probability per category.
- Estimated end-of-month spend for each budget.
- Suggested budget adjustment for next month.
- Early warning cards before the user crosses 80% or 100%.

### Add Transaction flow

- Auto-category suggestion from merchant/note/amount/time.
- Duplicate transaction warning.
- Merchant normalization.
- Voice entry parser for amount, merchant, category hint, and date.

## 3. Recommended ML strategy

Use a staged approach:

1. Ship deterministic analytics and simple statistical models first.
2. Add supervised ML where the app has repeated labels and enough training data.
3. Add LLM-style natural language summaries only after the numeric insight pipeline is stable.

Reason:

- The current app has small, user-level financial datasets.
- A six-month UPI export is available locally and is enough to bootstrap behavioral baselines before the app accumulates long in-product history.
- Explainability matters more than model complexity.
- Budget/risk insights can reach useful quality with robust statistical methods before deep models are justified.

## 4. Data foundation work required first

Before training models, standardize the transaction and insight pipeline.

### 4.1 Canonical entities

Keep these as the core learning entities:

- User
- Account
- Category
- Transaction
- Budget

Add these derived entities:

- NormalizedMerchant
- TransactionFeatures
- RecurringPattern
- InsightSnapshot
- ModelPrediction

### 4.2 Derived features to compute for every transaction

- `amount`
- `type`
- `categoryId`
- `accountId`
- `occurredAt`
- `day_of_week`
- `day_of_month`
- `week_of_month`
- `hour_of_day`
- `is_weekend`
- `days_since_last_transaction`
- `days_since_last_same_category`
- `days_since_last_same_merchant`
- `rolling_7d_spend`
- `rolling_30d_spend`
- `category_share_30d`
- `account_balance_after_tx`
- `budget_utilization_before_tx`
- `budget_utilization_after_tx`
- `merchant_text_clean`
- `note_text_clean`

### 4.3 Training data requirements

- Minimum useful threshold for personalization:
  - Category model: 50+ labeled transactions per user, otherwise back off to a global model.
  - Recurring detection: at least 3 similar transactions in a series.
  - Budget forecasting: at least 3 prior months for a category, otherwise use pooled category priors.
  - Cash-flow forecasting: at least 8 weeks of daily activity, otherwise use heuristic pacing.

### 4.4 Available six-month UPI dataset

The repo already contains a seed behavior dataset in `bb_ML/`:

- `bb_ML/bhim_transactions.csv`
  - 1,476 raw rows
  - date range: 2025-09-01 00:20:44 to 2026-02-12 21:01:30
  - status mix: 1,406 `SUCCESS`, 70 `FAILURE`
  - direction mix: 1,386 `DR`, 90 `CR`
- `bb_ML/clean_transactions.csv`
  - 1,316 cleaned rows
  - currently keeps successful debit transactions only
  - extracts a merchant-like counterparty field from the receiver string

Implication:

- This dataset is immediately useful for behavior modeling.
- It is not yet a full supervised training set for category prediction because it does not contain frontend category labels.
- The raw export should be preserved because the current cleaned file drops credits and failures, which are still useful for balance and behavioral modeling.

### 4.5 How the UPI dataset should be used

Use the six-month UPI dataset as the initial bootstrap corpus for:

- merchant normalization
- spend cadence and day/time behavior modeling
- recurring payment detection
- anomaly detection
- short-horizon cash-flow and spend pacing baselines
- budget-risk heuristics before enough app-native history accumulates

Do not use it directly as the only source for:

- final category classifier training without adding labels
- generic multi-user models, since it appears to represent one user's payment history

### 4.6 UPI ingestion pipeline

Create a repeatable preprocessing pipeline that converts the raw UPI export into a canonical training table.

Input columns already available:

- `Date`
- `Time`
- `Bank Name`
- `Account Number`
- `Sender`
- `Receiver`
- `Payment ID/Reference Number`
- `Pay/Collect`
- `Amount (in Rs.)`
- `DR/CR`
- `Status`

Canonical fields to produce:

- `transaction_ts`
- `direction` (`debit` or `credit`)
- `status`
- `amount_inr`
- `counterparty_raw`
- `counterparty_normalized`
- `upi_handle_hash`
- `reference_hash`
- `bank_name`
- `account_fingerprint`
- `is_success`
- `is_expense_candidate`
- `is_income_candidate`
- `hour_of_day`
- `day_of_week`
- `week_of_month`

Processing rules:

- Keep the raw file immutable.
- Build one canonical ledger from the raw CSV, not from the debit-only cleaned export.
- Create a second expense-only training view for spend-category and budget-related models.
- Hash or tokenize sensitive handles and reference identifiers before they are stored in production features.

## 5. Algorithms by use case

### 5.1 Merchant normalization

Purpose:
- Convert noisy note/UPI/payment strings into a stable merchant identity.

Approach:
- Rule-based cleaning first: uppercase, trim, remove UPI handles, IDs, punctuation noise.
- Fuzzy matching next: Levenshtein or token-sort similarity against known merchants for the same user.
- Embedding/clustering later: sentence embeddings plus agglomerative clustering for long-tail merchant strings.

Recommended v1:
- Regex cleaning + fuzzy matching + per-user alias table.

UPI dataset role:
- Use `Receiver`, `Sender`, and UPI handle patterns from the six-month export to build the first merchant alias dictionary.
- Store both raw and normalized merchant forms so the system can improve matching over time.

Output:
- `normalized_merchant`
- `merchant_confidence`

### 5.2 Auto-category prediction

Purpose:
- Pre-fill or recommend category during transaction creation and voice input parsing.

Features:
- Merchant text
- Note text
- Amount bucket
- Transaction type
- Day of week
- Time of day
- User history with same merchant

Recommended model:
- Baseline: TF-IDF on text + one-hot structured features + Logistic Regression.
- Upgrade: LightGBM or XGBoost on combined sparse/dense features.

Why this choice:
- Fast to train.
- Easy to explain.
- Works well on tabular + text-lite finance data.

Output:
- Top-3 category predictions
- Confidence score

UPI dataset role:
- The six-month UPI export should be used as the unlabeled bootstrap corpus.
- Add labels by mapping top recurring merchants and counterparties to the app's categories.
- Propagate labels merchant-first, then correct them manually for ambiguous merchants.
- Use app-native labeled transactions later to retrain a production classifier.

Recommended labeling workflow:

1. Normalize merchants from the UPI export.
2. Rank merchants by frequency and total spend.
3. Manually map the top merchants to existing frontend categories.
4. Auto-propagate those labels to matching transactions.
5. Keep uncertain rows as unlabeled rather than introducing noisy labels.

Metrics:
- Top-1 accuracy
- Top-3 accuracy
- Macro F1 by category

### 5.3 Recurring expense detection

Purpose:
- Detect subscriptions, rent, salary, EMI, utilities, and regular recharges.

Features:
- Merchant similarity
- Amount stability
- Interval stability between transactions
- Category stability

Recommended algorithm:
- Rule-based periodicity scoring first:
  - monthly interval around 28 to 31 days
  - weekly interval around 7 days
  - low variance in amount and merchant
- Optional upgrade:
  - DBSCAN or hierarchical clustering over interval and amount patterns

UPI dataset role:
- This is one of the best first uses of the six-month export because the data already contains timestamps, amounts, and counterparties.
- Expected recurring patterns include recharges, subscriptions, rent-like transfers, bills, and salary-like credits.

Output:
- `is_recurring`
- `recurring_frequency`
- `next_expected_date`
- `expected_amount_range`

Metrics:
- Precision for recurring labels
- Recall for known subscriptions

### 5.4 Budget overrun prediction

Purpose:
- Predict whether a budget will be exceeded before month-end.

Features:
- Current spend
- Day of month
- Spend pace vs prior months
- Spend pace vs same category history
- Number of transactions this month
- Recurring charges still expected this month

Recommended model:
- Baseline: deterministic pacing forecast
  - projected_month_end_spend = current_spend / elapsed_days * days_in_month
- ML upgrade: Gradient Boosted Regression Trees or Quantile Regression
  - predict end-of-month spend
  - derive overrun probability from quantiles

Output:
- Forecasted end-of-month spend
- Probability of budget breach
- Recommended action severity

Metrics:
- MAE for month-end spend forecast
- Calibration of overrun probability

UPI dataset role:
- Use the debit history to estimate baseline monthly spend pace even before enough budgets are created in-app.
- Once budgets exist, join historical merchant/category labels to budget categories for personalized breach forecasts.

### 5.5 Cash-flow and runway forecasting

Purpose:
- Explain whether the user is likely to run short before the next income cycle.

Features:
- Daily net cash flow
- Balance trend
- Recurring income dates
- Recurring expense dates
- Weekly seasonality

Recommended model:
- Baseline: seasonal naive + exponential smoothing.
- Upgrade: Prophet or SARIMAX only if data volume supports it.

Reason:
- User-level finance data is sparse.
- Heavy time-series models will overfit early.

UPI dataset role:
- Include both `DR` and `CR` transactions from the raw export.
- The current cleaned debit-only file is not enough for full runway forecasting.
- The 90 credit rows are limited but still valuable for detecting income cadence and refill behavior.

Output:
- Next 7-day and 30-day net cash-flow forecast
- Days of balance runway
- High-risk periods

Metrics:
- MAE / MAPE on daily net cash flow
- Directional accuracy for balance decline alerts

### 5.6 Spending anomaly detection

Purpose:
- Highlight unusual transactions and unusual category spikes for insight cards.

Features:
- Amount relative to user/category history
- Merchant novelty
- Transaction time novelty
- Daily category spend deviation

Recommended model:
- Baseline: robust z-score using median and MAD per category and merchant.
- Upgrade: Isolation Forest on user-level transaction features.

UPI dataset role:
- Train anomaly thresholds from the six-month behavior window first, then refresh them with live app data.
- Use merchant novelty, unusual hour, and amount deviation as the first anomaly dimensions.

Output:
- Anomaly score
- Explanation fields:
  - unusually large amount
  - first time with this merchant
  - spending spike in this category

Metrics:
- Precision on manually reviewed anomalies
- User dismissal rate in the UI

### 5.7 Insight ranking and card selection

Purpose:
- Pick the most useful 2 to 5 cards for the Home and Insights screens.

Recommended v1:
- Heuristic ranking score:
  - severity * confidence * recency * user_relevance

Upgrade:
- Learning-to-rank after enough click and dismissal events exist.

Output:
- Ordered list of insight cards with title, body, confidence, CTA, and expiry

## 6. Voice and text ingestion plan

The current add-transaction flow already has a placeholder voice-entry experience. Convert it into a structured parsing pipeline.

### v1 pipeline

1. Speech-to-text
2. Entity extraction
3. Merchant normalization
4. Category recommendation
5. Confirmation UI before save

Extracted fields:

- amount
- merchant
- transaction type
- category candidate
- date
- note

Recommended parser approach:

- Start with rule-based entity extraction plus a lightweight intent parser.
- Reuse the category model after extracting merchant and note text.

The `bb_ML` folder can remain the experimentation area for message or UPI-string cleanup, but production inference should live behind the backend API.

The six-month UPI dataset should also be reused here to:

- expand merchant aliases for spoken and typed entries
- improve parsing of payment-style descriptions and short merchant names
- provide realistic examples for parser evaluation

## 7. Backend/API changes needed

Add new backend surfaces instead of computing insights directly in the mobile app.

### New endpoints

- `GET /api/insights/summary/`
- `GET /api/insights/budgets/`
- `GET /api/insights/anomalies/`
- `POST /api/ml/predict-category/`
- `POST /api/ml/parse-transaction-input/`

### New background jobs

- Feature generation after transaction create/update
- Daily insight refresh job
- Weekly model retraining job
- Monthly budget recommendation job
- UPI import and normalization job for offline historical backfill

### Storage additions

- table for normalized merchants
- table for model predictions and confidence
- table for cached insight cards shown to the user
- table for feedback events:
  - viewed
  - clicked
  - dismissed
  - accepted suggestion
- table or artifact store for imported UPI history and derived training features

## 8. Frontend integration plan

### Home tab integration

- Replace static trend badge with forecast-based change.
- Add 1 to 3 ranked insight cards under the balance hero.
- Mark recent transactions with badges such as `Recurring`, `Unusual`, or `Category changed`.

### Insights tab integration

- Keep the chart, but drive it with period-aware backend aggregates.
- Add cards for:
  - recurring payments
  - anomalies
  - spending change vs prior period
- Let the period selector request different model windows.

### Budget tab integration

- Show projected end-of-month spend beside each limit.
- Show breach probability with clear thresholds:
  - low: <30%
  - medium: 30% to 70%
  - high: >70%
- Add budget recommendation for next month based on last 3 months.

### Add Transaction integration

- Preselect category from the prediction API.
- Show confidence and let the user override.
- Warn if a similar transaction was already recorded on the same day.

## 9. Delivery roadmap

### Phase 0: Data and analytics baseline

Deliver:
- canonical feature extraction
- merchant normalization
- deterministic budget pacing
- deterministic period comparison insights
- raw UPI import pipeline and canonical ledger build
- merchant and counterparty normalization from the six-month export

Exit criteria:
- Home, Insights, and Budget tabs can render backend-generated insight payloads without ML training.
- Historical UPI activity is queryable in a normalized format for behavior calculations.

### Phase 1: First ML features

Deliver:
- category prediction model
- recurring payment detector
- anomaly detection
- merchant-to-category bootstrap labels derived from the six-month UPI history

Exit criteria:
- add-transaction flow can suggest categories
- insights screen can show recurring and anomaly cards with confidence

### Phase 2: Forecasting

Deliver:
- budget overrun forecast
- cash-flow runway forecast
- next-month budget recommendation

Exit criteria:
- budget tab shows forecasted month-end spend
- home tab shows runway or spend pace alerts

### Phase 3: Ranking and feedback loop

Deliver:
- insight ranking
- user feedback capture
- retraining pipeline from accepted and dismissed suggestions

Exit criteria:
- insight relevance improves from user interactions instead of only static logic

## 10. Evaluation plan

### Offline metrics

- Category prediction: top-1, top-3, macro F1
- Budget forecast: MAE, MAPE
- Cash-flow forecast: MAE, directional accuracy
- Recurring detection: precision, recall
- Anomaly detection: precision at top-k

Time-based validation for the current six-month UPI corpus:

- train on September 1, 2025 to December 31, 2025
- validate on January 1, 2026 to January 31, 2026
- test on February 1, 2026 to February 12, 2026

Use rolling-window backtests as more monthly data is added.

### Online product metrics

- suggestion acceptance rate
- insight click-through rate
- insight dismissal rate
- time-to-log-transaction
- budget breach reduction month over month

## 11. Implementation principles

- Keep inference server-side, not inside the React Native app.
- Prefer simple models with strong features before adding complex models.
- Store model confidence and explanation fields for every prediction.
- Always provide a rule-based fallback when data is too sparse.
- Separate exploratory code in `bb_ML/` from production services in `backend/`.
- Treat the six-month UPI export as seed history for personalization, not as a substitute for app-native labeled data.
- Never expose raw UPI handles, account numbers, or reference IDs to the client once ingested.

## 12. Immediate next implementation tasks

1. Create backend schema for `NormalizedMerchant`, `ModelPrediction`, `RecurringPattern`, and `InsightSnapshot`.
2. Build a raw UPI import pipeline from `bb_ML/bhim_transactions.csv` into a canonical ledger table.
3. Extend the preprocessing script so it keeps both debit and credit records for behavior modeling.
4. Build a transaction feature-generation module triggered on create/update and reusable for imported UPI rows.
5. Add a merchant-labeling workflow for mapping frequent UPI counterparties to app categories.
6. Add a non-ML `insights/summary` endpoint that returns:
   - period comparison
   - top category
   - budget pace
   - simple anomaly flags
7. Implement the category prediction training notebook in `bb_ML/` using labeled historical transactions.
8. Implement recurring-pattern and anomaly baselines using the six-month UPI history first.
9. Move the final trained inference path into backend APIs.
10. Update the Home, Insights, Budget, and Add Transaction screens to consume backend insight payloads instead of local-only calculations.

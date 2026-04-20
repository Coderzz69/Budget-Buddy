import requests
import jwt

base_url = 'http://localhost:8001/api'

# 1. Sync User
user_data = {
    'clerkId': 'user_12345',
    'email': 'test@example.com',
    'name': 'Test User'
}
resp = requests.post(f'{base_url}/auth/sync-user/', json=user_data)
print('Sync User:', resp.status_code, resp.json())

token = jwt.encode({"sub": "user_12345"}, "secret", algorithm="HS256")
headers = {
    "Authorization": f"Bearer {token}",
    "Accept": "application/json"
}

def log_resp(name, resp):
    try:
        print(name + ':', resp.status_code, resp.json())
    except:
        print(name + ':', resp.status_code, resp.text)

# 2. Get Accounts
resp = requests.get(f'{base_url}/accounts/', headers=headers)
log_resp('Get Accounts', resp)

# 3. Create Account
account_data = {
    'name': 'Checking',
    'type': 'bank',
    'balance': 1000.0
}
resp = requests.post(f'{base_url}/accounts/', headers=headers, json=account_data)
log_resp('Create Account', resp)
account_id = None
if resp.status_code == 201:
    account_id = resp.json().get('id')

# 4. Create Category
cat_data = {
    'name': 'Food',
    'icon': 'burger',
    'color': 'red'
}
resp = requests.post(f'{base_url}/categories/', headers=headers, json=cat_data)
log_resp('Create Category', resp)
cat_id = None
if resp.status_code == 201:
    cat_id = resp.json().get('id')

# 5. Create Transaction
if account_id and cat_id:
    txn_data = {
        'accountId': account_id,
        'categoryId': cat_id,
        'type': 'expense',
        'amount': 250.0,
        'note': 'Groceries',
        'occurredAt': '2026-04-07T10:00:00Z'
    }
    resp = requests.post(f'{base_url}/transactions/', headers=headers, json=txn_data)
    log_resp('Create Transaction', resp)

    # Check updated balance
    resp = requests.get(f'{base_url}/accounts/', headers=headers)
    log_resp('Updated Accounts after Expense', resp)
else:
    print("Could not create transaction because account/category lacked ids.")



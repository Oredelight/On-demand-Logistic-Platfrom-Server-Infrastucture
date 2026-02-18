import uuid

def generate_referral_code():
    return str(uuid.uuid4())[:8]
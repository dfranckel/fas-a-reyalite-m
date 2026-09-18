import hashlib

SECRET_SALT = "FAS2026_SECRET"  # Dwe presizman menm ak sa ki nan app.py a

def get_pin_for_user(code_str):
    raw_str = f"{code_str.strip().upper()}{SECRET_SALT}"
    return hashlib.sha256(raw_str.encode('utf-8')).hexdigest().upper()[:6]

if __name__ == "__main__":
    while True:
        user_code = input("\n[ADMIN] Antre kòd itilizatè a (oswa 'q' pou soti): ")
        if user_code.lower() == 'q':
            break
        
        pin = get_pin_for_user(user_code)
        print(f"👉 PIN konfimasyon pou voye bay itilizatè a se : {pin}")
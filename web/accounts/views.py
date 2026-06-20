from django.shortcuts import render


def signup_terms(request):
    return render(request, 'accounts/signup_terms.html')


def signup_name(request):
    return render(request, 'accounts/signup_name.html')


def withdraw(request):
    email = 'bugbudaegong@gmail.com'            # 추후 작업 시 변경
    user = getattr(request, 'user', None)
    if getattr(user, 'is_authenticated', False) and getattr(user, 'email', ''):
        email = user.email
    return render(request, 'accounts/withdraw.html', {
        'withdraw_email': email,
        'is_complete': False,
    })


def withdraw_complete(request):
    return render(request, 'accounts/withdraw.html', {
        'is_complete': True,
    })

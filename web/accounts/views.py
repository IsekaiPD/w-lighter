import re
import secrets

from django.contrib import messages
from django.contrib.auth import login, logout
from django.db import IntegrityError, transaction
from django.shortcuts import redirect, render

from .models import User
from .oauth import (
    OAuthError,
    build_authorize_url,
    normalize_user_info,
    request_access_token,
    request_user_info,
)


OAUTH_STATE_SESSION_KEY = 'oauth_state'
PENDING_SIGNUP_SESSION_KEY = 'pending_oauth_signup'
SIGNUP_TERMS_AGREED_SESSION_KEY = 'signup_terms_agreed'
NICKNAME_PATTERN = re.compile(r'^[가-힣a-zA-Z0-9]{2,10}$')


def login_user(request, user):
    login(request, user, backend='django.contrib.auth.backends.ModelBackend')


def clear_signup_session(request):
    request.session.pop(PENDING_SIGNUP_SESSION_KEY, None)
    request.session.pop(SIGNUP_TERMS_AGREED_SESSION_KEY, None)
    request.session.modified = True


def get_pending_signup(request):
    return request.session.get(PENDING_SIGNUP_SESSION_KEY)


def redirect_to_landing_with_error(request, message):
    messages.error(request, message)
    return redirect('pages:landing')


def find_existing_user(oauth_profile):
    provider_user = User.objects.filter(
        oauth_provider=oauth_profile['oauth_provider'],
        provider_user_id=oauth_profile['provider_user_id'],
    ).first()
    if provider_user:
        return provider_user
    return User.objects.filter(email=oauth_profile['email']).first()


def oauth_login(request, provider):
    try:
        state = secrets.token_urlsafe(32)
        request.session[OAUTH_STATE_SESSION_KEY] = state
        request.session.modified = True
        return redirect(build_authorize_url(request, provider, state))
    except OAuthError as error:
        return redirect_to_landing_with_error(request, str(error))


def oauth_callback(request, provider):
    error = request.GET.get('error')
    if error:
        return redirect_to_landing_with_error(request, '소셜 로그인이 취소되었습니다.')

    code = request.GET.get('code')
    state = request.GET.get('state')
    saved_state = request.session.pop(OAUTH_STATE_SESSION_KEY, None)
    request.session.modified = True

    if not code or not state or state != saved_state:
        return redirect_to_landing_with_error(request, '소셜 로그인 요청이 올바르지 않습니다.')

    try:
        access_token = request_access_token(request, provider, code, state)
        user_info = request_user_info(provider, access_token)
        oauth_profile = normalize_user_info(provider, user_info)
    except OAuthError as error:
        return redirect_to_landing_with_error(request, str(error))

    existing_user = find_existing_user(oauth_profile)
    if existing_user:
        if existing_user.is_withdrawn:
            return redirect_to_landing_with_error(request, '탈퇴 처리된 계정입니다.')
        login_user(request, existing_user)
        clear_signup_session(request)
        return redirect('works:library')

    request.session[PENDING_SIGNUP_SESSION_KEY] = oauth_profile
    request.session.pop(SIGNUP_TERMS_AGREED_SESSION_KEY, None)
    request.session.modified = True
    return redirect('accounts:signup_terms')


def signup_terms(request):
    if request.user.is_authenticated:
        return redirect('works:library')
    if not get_pending_signup(request):
        return redirect_to_landing_with_error(request, '소셜 로그인을 먼저 진행해 주세요.')

    if request.method == 'POST':
        has_required_agreements = (
            request.POST.get('terms_agreed') == 'on'
            and request.POST.get('privacy_agreed') == 'on'
        )
        if not has_required_agreements:
            return render(request, 'accounts/signup_terms.html', {
                'signup_error': '필수 약관에 모두 동의해 주세요.',
            })

        request.session[SIGNUP_TERMS_AGREED_SESSION_KEY] = True
        request.session.modified = True
        return redirect('accounts:signup_name')

    return render(request, 'accounts/signup_terms.html')


def signup_name(request):
    if request.user.is_authenticated:
        return redirect('works:library')

    pending_signup = get_pending_signup(request)
    if not pending_signup:
        return redirect_to_landing_with_error(request, '소셜 로그인을 먼저 진행해 주세요.')
    if not request.session.get(SIGNUP_TERMS_AGREED_SESSION_KEY):
        return redirect('accounts:signup_terms')

    if request.method == 'POST':
        nickname = request.POST.get('nickname', '').strip()
        if not NICKNAME_PATTERN.match(nickname):
            return render(request, 'accounts/signup_name.html', {
                'signup_error': '닉네임은 공백 없이 한글, 영어, 숫자 2~10자로 입력해 주세요.',
                'nickname_value': nickname,
            })

        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    email=pending_signup['email'],
                    nickname=nickname,
                    oauth_provider=pending_signup['oauth_provider'],
                    provider_user_id=pending_signup['provider_user_id'],
                )
        except IntegrityError:
            existing_user = find_existing_user(pending_signup)
            if not existing_user or existing_user.is_withdrawn:
                return render(request, 'accounts/signup_name.html', {
                    'signup_error': '이미 가입된 이메일입니다. 다시 로그인해 주세요.',
                    'nickname_value': nickname,
                })
            user = existing_user

        login_user(request, user)
        clear_signup_session(request)
        return redirect('works:library')

    return render(request, 'accounts/signup_name.html')


def logout_view(request):
    logout(request)
    clear_signup_session(request)
    return redirect('pages:landing')


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

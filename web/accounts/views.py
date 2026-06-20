from django.shortcuts import render


def signup_terms(request):
    return render(request, 'accounts/signup_terms.html')


def signup_name(request):
    return render(request, 'accounts/signup_name.html')

from django.shortcuts import render


def localization(request):
    return render(request, 'guides/localization.html')

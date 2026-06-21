from django.contrib.auth.decorators import login_required
from django.shortcuts import render


@login_required(login_url='pages:landing')
def character_list(request):
    return render(request, 'characters/character_list.html')

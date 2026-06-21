from django.shortcuts import render

def character_list(request):
    return render(request, 'characters/character_list.html')

from django.shortcuts import render

def character_list(request, work_pk):
    return render(request, 'characters/character_list.html', {'work_pk': work_pk})



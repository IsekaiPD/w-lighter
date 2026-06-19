from django.shortcuts import render

def library(request):
    return render(request, 'works/library.html')

def work_detail(request, pk):
    return render(request, 'works/work_detail.html')

def episode_detail(request, work_pk, episode_pk):
    return render(request, 'works/episode_detail.html')

def episode_translate(request, work_pk, episode_pk):
    return render(request, 'works/episode_translate.html')

def episode_register(request, work_pk):
    return render(request, 'works/episode_register.html')

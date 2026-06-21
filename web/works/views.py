from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.http import require_POST

from .models import Episode, Work


@login_required(login_url='pages:landing')
def library(request):
    works = Work.objects.filter(user=request.user).order_by('-created_at')
    return render(request, 'works/library.html', {'works': works})


@login_required(login_url='pages:landing')
@require_POST
def work_create(request):
    title    = request.POST.get('title', '').strip()
    pen_name = request.POST.get('author', '').strip()
    genre    = request.POST.get('genre', '').strip()
    synopsis = request.POST.get('synopsis', '').strip() or None

    errors = {}
    if not title:    errors['title']  = '작품 제목을 입력해주세요'
    if not pen_name: errors['author'] = '필명을 입력해주세요'
    if not genre:    errors['genre']  = '장르를 선택해주세요'
    if errors:
        return JsonResponse({'ok': False, 'errors': errors})

    work = Work.objects.create(user=request.user, title=title, pen_name=pen_name,
                               genre=genre, synopsis=synopsis)
    return JsonResponse({'ok': True, 'work': {
        'id': work.work_id, 'title': work.title,
        'pen_name': work.pen_name, 'genre': work.genre,
    }})


@login_required(login_url='pages:landing')
@require_POST
def work_update(request, pk):
    work     = get_object_or_404(Work, pk=pk, user=request.user)
    title    = request.POST.get('title', '').strip()
    pen_name = request.POST.get('author', '').strip()
    genre    = request.POST.get('genre', '').strip()
    synopsis = request.POST.get('synopsis', '').strip() or None

    errors = {}
    if not title:    errors['title']  = '작품 제목을 입력해주세요'
    if not pen_name: errors['author'] = '필명을 입력해주세요'
    if not genre:    errors['genre']  = '장르를 선택해주세요'
    if errors:
        return JsonResponse({'ok': False, 'errors': errors})

    work.title = title; work.pen_name = pen_name
    work.genre = genre; work.synopsis = synopsis
    work.save()
    return JsonResponse({'ok': True, 'work': {
        'id': work.work_id, 'title': work.title,
        'pen_name': work.pen_name, 'genre': work.genre,
    }})


@login_required(login_url='pages:landing')
@require_POST
def work_delete(request, pk):
    work = get_object_or_404(Work, pk=pk, user=request.user)
    work.delete()
    return JsonResponse({'ok': True})


@login_required(login_url='pages:landing')
def work_detail(request, pk):
    work = get_object_or_404(Work, pk=pk, user=request.user)
    episodes = work.episodes.all().order_by('episode_id')
    episode_count = episodes.count()
    return render(request, 'works/work_detail.html', {
        'work': work, 'episodes': episodes, 'episode_count': episode_count,
    })


def _episode_number(episode):
    return Episode.objects.filter(
        work=episode.work, episode_id__lte=episode.episode_id).count()


@login_required(login_url='pages:landing')
def episode_detail(request, work_pk, episode_pk):
    work    = get_object_or_404(Work, pk=work_pk, user=request.user)
    episode = get_object_or_404(Episode, pk=episode_pk, work=work)
    ep_num  = _episode_number(episode)
    return render(request, 'works/episode_detail.html', {
        'work': work, 'episode': episode, 'ep_num': ep_num,
    })


@login_required(login_url='pages:landing')
def episode_translate(request, work_pk, episode_pk):
    work    = get_object_or_404(Work, pk=work_pk, user=request.user)
    episode = get_object_or_404(Episode, pk=episode_pk, work=work)
    ep_num  = _episode_number(episode)
    return render(request, 'works/episode_translate.html', {
        'work': work, 'episode': episode, 'ep_num': ep_num,
    })


@login_required(login_url='pages:landing')
def episode_edit(request, work_pk, episode_pk):
    work    = get_object_or_404(Work, pk=work_pk, user=request.user)
    episode = get_object_or_404(Episode, pk=episode_pk, work=work)

    if request.method == 'POST':
        title         = request.POST.get('title', '').strip()
        original_text = request.POST.get('content', '').strip()
        errors = {}
        if not title:         errors['title']   = '회차 제목을 입력해주세요'
        if not original_text: errors['content'] = '원문을 입력해주세요'
        if errors:
            return JsonResponse({'ok': False, 'errors': errors})
        episode.title = title; episode.original_text = original_text
        episode.save()
        return JsonResponse({'ok': True})

    ep_num = _episode_number(episode)
    return render(request, 'works/episode_edit.html', {
        'work': work, 'episode': episode, 'ep_num': ep_num,
    })


@login_required(login_url='pages:landing')
@require_POST
def episode_delete(request, work_pk, episode_pk):
    work    = get_object_or_404(Work, pk=work_pk, user=request.user)
    episode = get_object_or_404(Episode, pk=episode_pk, work=work)
    episode.delete()
    return JsonResponse({'ok': True})


@login_required(login_url='pages:landing')
def episode_register(request, work_pk):
    work = get_object_or_404(Work, pk=work_pk, user=request.user)

    if request.method == 'POST':
        title         = request.POST.get('title', '').strip()
        original_text = request.POST.get('content', '').strip()
        errors = {}
        if not title:         errors['title']   = '회차 제목을 입력해주세요'
        if not original_text: errors['content'] = '원문을 입력해주세요'
        if errors:
            return JsonResponse({'ok': False, 'errors': errors})
        episode = Episode.objects.create(work=work, title=title,
                                         original_text=original_text)
        return JsonResponse({'ok': True, 'episode': {
            'id': episode.episode_id, 'title': episode.title,
        }})

    episode_count = work.episodes.count()
    return render(request, 'works/episode_register.html', {
        'work': work, 'episode_count': episode_count,
    })

import json

from django.contrib.auth.decorators import login_required
from django.db import connection
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.http import require_POST

from common import model_server
from .models import Episode, Work

# 모델 서버 target_country → 프론트 언어 탭
_COUNTRY_TO_LANG = {'US': 'EN', 'EN': 'EN', 'CN': 'CN', 'JP': 'JP', 'TH': 'TH', 'KR': 'KR'}


@login_required(login_url='pages:landing')
def library(request):
    works = Work.objects.filter(user=request.user).order_by('-created_at')
    # TODO: FastAPI translations/reviews 테이블 연결 후 수정 필요
    # 현재는 Episode.updated_at 기준 임시 표시 (번역/검수 구분 불가)
    # FastAPI 스키마 받은 후 managed=False 모델 만들고 실제 완료 기록으로 교체할 것
    recent_episode = (
        Episode.objects
        .filter(work__user=request.user)
        .select_related('work')
        .order_by('-updated_at')
        .first()
    )
    return render(request, 'works/library.html', {
        'works': works,
        'nickname': request.user.nickname,
        'recent_episode': recent_episode,
    })


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
    # 회차번호 오름차순 기본 정렬
    episodes = list(work.episodes.all().order_by('episode_number', 'episode_id'))
    episode_count = len(episodes)

    # 회차별 번역 완료 언어(translation_results) 계산
    ep_ids = [e.episode_id for e in episodes]
    trans_map = {}
    if ep_ids:
        placeholders = ','.join(['%s'] * len(ep_ids))
        with connection.cursor() as cur:
            cur.execute(
                "SELECT DISTINCT episode_id, target_country "
                "FROM translation_results WHERE episode_id IN (%s)" % placeholders,
                ep_ids,
            )
            for ep_id, country in cur.fetchall():
                lang = _COUNTRY_TO_LANG.get((country or '').upper(), None)
                if lang:
                    trans_map.setdefault(ep_id, set()).add(lang)

    lang_order = ['EN', 'CN', 'JP', 'TH']
    translated_count = 0
    for e in episodes:
        langs = trans_map.get(e.episode_id, set())
        e.trans_langs = [l for l in lang_order if l in langs]  # 정렬된 언어 목록
        if e.trans_langs:
            translated_count += 1

    return render(request, 'works/work_detail.html', {
        'work': work, 'episodes': episodes, 'episode_count': episode_count,
        'translated_count': translated_count,
        'untranslated_count': episode_count - translated_count,
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
        title          = request.POST.get('title', '').strip()
        original_text  = request.POST.get('content', '').strip()
        episode_number = request.POST.get('episode_number', '0').strip()
        errors = {}
        if not title:         errors['title']   = '회차 제목을 입력해주세요'
        if not original_text: errors['content'] = '원문을 입력해주세요'
        if errors:
            return JsonResponse({'ok': False, 'errors': errors})
        episode = Episode.objects.create(
            work=work, title=title, original_text=original_text,
            episode_number=int(episode_number) if episode_number.isdigit() else 0,
        )
        return JsonResponse({'ok': True, 'episode': {
            'id': episode.episode_id, 'title': episode.title,
            'episode_number': episode.episode_number,
        }})

    episode_count = work.episodes.count()
    return render(request, 'works/episode_register.html', {
        'work': work, 'episode_count': episode_count,
    })

@login_required(login_url='pages:landing')
@require_POST
def work_set_cover(request, pk):
    work = get_object_or_404(Work, pk=pk, user=request.user)
    url  = request.POST.get('url', '').strip()
    work.cover_image_url = url or None
    work.save(update_fields=['cover_image_url'])
    return JsonResponse({'ok': True})


# ===== 모델 서버(FastAPI) 연동 프록시 =====

@login_required(login_url='pages:landing')
@require_POST
def episode_translate_run(request, work_pk, episode_pk):
    """번역 실행. 브라우저 → 이 뷰 → FastAPI /translation/translate."""
    work    = get_object_or_404(Work, pk=work_pk, user=request.user)
    episode = get_object_or_404(Episode, pk=episode_pk, work=work)

    try:
        body = json.loads(request.body or '{}')
    except ValueError:
        return JsonResponse({'ok': False, 'error': '잘못된 요청입니다.'}, status=400)

    payload = {
        'episodeId': str(episode.episode_id),  # 문자열로 보내야 함
        'sourceText': episode.original_text,
        'targetCountry': model_server.map_country(body.get('targetCountry', 'EN')),
        'genre': model_server.map_genre(work.genre),
        'includeInternal': bool(body.get('includeInternal', False)),
        'saveTranslationResult': True,
    }
    try:
        data = model_server.call('/api/v1/translation/translate', payload)
    except model_server.ModelServerError as e:
        return JsonResponse({'ok': False, 'error': e.message}, status=e.status_code)

    return JsonResponse({'ok': True, 'result': data})


@login_required(login_url='pages:landing')
@require_POST
def episode_inspect_chat(request, work_pk, episode_pk):
    """검수 챗봇. 브라우저 → 이 뷰 → FastAPI /translation/inspect-chat."""
    work    = get_object_or_404(Work, pk=work_pk, user=request.user)
    episode = get_object_or_404(Episode, pk=episode_pk, work=work)

    try:
        body = json.loads(request.body or '{}')
    except ValueError:
        return JsonResponse({'ok': False, 'error': '잘못된 요청입니다.'}, status=400)

    message = (body.get('message') or '').strip()
    if not message:
        return JsonResponse({'ok': False, 'error': '메시지를 입력해주세요.'}, status=400)

    payload = {
        'episodeId': str(episode.episode_id),
        'message': message,
        'targetCountry': model_server.map_country(body.get('targetCountry', 'EN')),
        'genre': model_server.map_genre(work.genre),
    }
    try:
        data = model_server.call('/api/v1/translation/inspect-chat', payload)
    except model_server.ModelServerError as e:
        return JsonResponse({'ok': False, 'error': e.message}, status=e.status_code)

    return JsonResponse({'ok': True, 'result': data})


@login_required(login_url='pages:landing')
def episode_translations(request, work_pk, episode_pk):
    """이 회차에 저장된 번역 목록(RDS translation_results)을 반환.
    페이지 로드 시 버전 목록/번역본 복원에 사용."""
    work    = get_object_or_404(Work, pk=work_pk, user=request.user)
    episode = get_object_or_404(Episode, pk=episode_pk, work=work)

    with connection.cursor() as cur:
        cur.execute(
            "SELECT translation_id, target_country, translated_text, summary, "
            "inspection_report, created_at "
            "FROM translation_results WHERE episode_id = %s ORDER BY translation_id ASC",
            [episode.episode_id],
        )
        rows = cur.fetchall()

    items = []
    for r in rows:
        report = None
        if r[4]:
            try:
                report = json.loads(r[4]) if isinstance(r[4], str) else r[4]
            except (ValueError, TypeError):
                report = None
        items.append({
            'id': r[0],
            'lang': _COUNTRY_TO_LANG.get((r[1] or '').upper(), 'EN'),
            'translatedText': r[2],
            'summary': r[3],
            'inspectionReport': report,
            'createdAt': r[5].strftime('%Y.%m.%d %H:%M') if r[5] else '',
        })
    return JsonResponse({'ok': True, 'items': items})

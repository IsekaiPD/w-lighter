import json

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.http import require_POST

from common import model_server
from works.models import Work


@login_required(login_url='pages:landing')
def localization(request):
    works = Work.objects.filter(user=request.user).order_by('-created_at')
    return render(request, 'guides/localization.html', {'works': works})


@login_required(login_url='pages:landing')
@require_POST
def guide_generate(request):
    """현지화 가이드 생성. 브라우저 → 이 뷰 → FastAPI /guide.

    NOTE: /guide 요청/응답 스키마가 공유 문서에 없어 일반형으로 구현.
    실제 필드명 확정 후 payload / 프론트 렌더링을 맞출 것.
    """
    try:
        body = json.loads(request.body or '{}')
    except ValueError:
        return JsonResponse({'ok': False, 'error': '잘못된 요청입니다.'}, status=400)

    work = get_object_or_404(Work, pk=body.get('workId'), user=request.user)

    payload = {
        'workId': str(work.work_id),
        'genre': model_server.map_genre(work.genre),
        'synopsis': model_server.work_source_text(work),
        'targetCountry': model_server.map_country(body.get('targetCountry', 'EN')),
    }
    try:
        data = model_server.call('/api/v1/guide', payload)
    except model_server.ModelServerError as e:
        return JsonResponse({
            'ok': False, 'error': str(e.message),
            'sentPayload': payload, 'detail': e.payload,
        }, status=e.status_code)

    return JsonResponse({'ok': True, 'result': data})

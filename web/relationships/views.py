import json

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.http import require_POST

from common import model_server
from works.models import Work


@login_required(login_url='pages:landing')
def relationship(request):
    works = Work.objects.filter(user=request.user).order_by('-created_at')
    return render(request, 'relationships/relationship.html', {'works': works})


@login_required(login_url='pages:landing')
@require_POST
def relationship_map(request):
    """관계도 생성. 브라우저 → 이 뷰 → FastAPI /relationship-map.

    NOTE: /relationship-map 요청/응답 스키마가 공유 문서에 없어 일반형으로 구현.
    실제 필드명 확정 후 payload / 프론트 렌더링을 맞출 것.
    """
    try:
        body = json.loads(request.body or '{}')
    except ValueError:
        return JsonResponse({'ok': False, 'error': '잘못된 요청입니다.'}, status=400)

    work = get_object_or_404(Work, pk=body.get('workId'), user=request.user)

    # 요구사항: 관계도는 캐릭터 설정(=시놉시스 기반)에서 생성. 시놉시스 없으면 생성 불가.
    synopsis = (work.synopsis or '').strip()
    if not synopsis:
        return JsonResponse({
            'ok': False,
            'error': '이 작품은 시놉시스가 없어 관계도를 생성할 수 없습니다. 작품 줄거리를 먼저 입력해주세요.',
        }, status=400)

    payload = {
        'workId': str(work.work_id),
        'genre': model_server.map_genre(work.genre),
        'synopsis': synopsis,
    }
    try:
        data = model_server.call('/api/v1/relationship-map', payload)
    except model_server.ModelServerError as e:
        return JsonResponse({
            'ok': False, 'error': str(e.message),
            'sentPayload': payload, 'detail': e.payload,
        }, status=e.status_code)

    return JsonResponse({'ok': True, 'result': data})

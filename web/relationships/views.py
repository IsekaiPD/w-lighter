import json
import re
from datetime import timezone as dt_timezone

from django.contrib.auth.decorators import login_required
from django.db import connection
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from django.views.decorators.http import require_POST

from common import model_server
from works.models import Work


@login_required(login_url='pages:landing')
def relationship(request):
    works = Work.objects.filter(user=request.user).order_by('-created_at')
    return render(request, 'relationships/relationship.html', {'works': works})


@login_required(login_url='pages:landing')
def relationship_saved(request, work_pk):
    """작품에 저장된 관계도 목록(RDS relation_maps)을 반환. version 부여(생성순)."""
    work = get_object_or_404(Work, pk=work_pk, user=request.user)
    with connection.cursor() as cur:
        cur.execute(
            "SELECT map_id, map_content, created_at "
            "FROM relation_maps WHERE work_id = %s ORDER BY map_id ASC",
            [work.work_id],
        )
        rows = cur.fetchall()
    maps = []
    for i, r in enumerate(rows):
        maps.append({
            'id': r[0],
            'version': i + 1,  # 생성순 버전
            'content': r[1],
            'createdAt': timezone.localtime(r[2].replace(tzinfo=dt_timezone.utc) if r[2].tzinfo is None else r[2]).strftime('%Y.%m.%d %H:%M') if r[2] else '',
        })
    return JsonResponse({'ok': True, 'maps': maps})


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
        'workId': work.work_id,
        'workTitle': work.title,
        'includeHtml': True,
    }
    character_ids = body.get('characterIds')
    if isinstance(character_ids, list) and character_ids:
        payload['characterIds'] = character_ids
    try:
        data = model_server.call('/api/v1/relationship-map', payload)
    except model_server.ModelServerError as e:
        return JsonResponse({
            'ok': False, 'error': str(e.message),
            'sentPayload': payload, 'detail': e.payload,
        }, status=e.status_code)

    return JsonResponse({'ok': True, 'result': data})


@login_required(login_url='pages:landing')
@require_POST
def relationship_delete(request, work_pk):
    """관계도 삭제. RDS relation_maps에서 실제로 제거."""
    work = get_object_or_404(Work, pk=work_pk, user=request.user)
    try:
        body = json.loads(request.body or '{}')
    except ValueError:
        return JsonResponse({'ok': False, 'error': '잘못된 요청입니다.'}, status=400)

    map_id = body.get('mapId')
    if not map_id:
        return JsonResponse({'ok': False, 'error': 'mapId가 없습니다.'}, status=400)

    with connection.cursor() as cur:
        cur.execute(
            "DELETE FROM relation_maps WHERE map_id = %s AND work_id = %s",
            [map_id, work.work_id],
        )
    return JsonResponse({'ok': True})


@login_required(login_url='pages:landing')
@require_POST
def relationship_positions(request, work_pk):
    """노드 드래그 위치 저장. map_content 내 __REL_POSITIONS__ 값을 교체."""
    work = get_object_or_404(Work, pk=work_pk, user=request.user)
    try:
        body = json.loads(request.body or '{}')
    except ValueError:
        return JsonResponse({'ok': False, 'error': '잘못된 요청입니다.'}, status=400)

    map_id = body.get('mapId')
    positions = body.get('positions')
    if not map_id or not isinstance(positions, dict):
        return JsonResponse({'ok': False, 'error': 'mapId 또는 positions가 없습니다.'}, status=400)

    with connection.cursor() as cur:
        cur.execute(
            "SELECT map_content FROM relation_maps WHERE map_id = %s AND work_id = %s",
            [map_id, work.work_id],
        )
        row = cur.fetchone()

    if not row:
        return JsonResponse({'ok': False, 'error': '관계도를 찾을 수 없습니다.'}, status=404)

    positions_json = json.dumps(positions, ensure_ascii=False)
    content = re.sub(
        r'window\.__REL_POSITIONS__\s*=\s*[^;]+;',
        f'window.__REL_POSITIONS__={positions_json};',
        row[0],
    )

    with connection.cursor() as cur:
        cur.execute(
            "UPDATE relation_maps SET map_content = %s WHERE map_id = %s AND work_id = %s",
            [content, map_id, work.work_id],
        )
    return JsonResponse({'ok': True})

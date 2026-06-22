from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.shortcuts import render
from django.utils import timezone
from datetime import timedelta, datetime

from .models import CreditTransaction, Payment


@login_required(login_url='pages:landing')
def credit_charge(request):
    return render(request, 'credits/credit_charge.html')


@login_required(login_url='pages:landing')
def credit_history(request):
    tab       = request.GET.get('tab', 'charge')
    page      = request.GET.get('page', 1)
    date_from = request.GET.get('date_from', '')
    date_to   = request.GET.get('date_to', '')
    cutoff    = timezone.now() - timedelta(hours=24)
    today     = timezone.now()

    df = dt = None
    if date_from:
        try:
            df = datetime.strptime(date_from, '%Y-%m-%d').date()
        except ValueError:
            pass
    if date_to:
        try:
            dt = datetime.strptime(date_to, '%Y-%m-%d').date()
        except ValueError:
            pass

    # ── 충전 내역: Payment + CreditTransaction(CHARGE) 합산 ──
    payments_qs = Payment.objects.filter(user=request.user).select_related('plan').order_by('-created_at')
    bonuses_qs  = CreditTransaction.objects.filter(user=request.user, transaction_type='CHARGE').order_by('-created_at')

    if df:
        payments_qs = payments_qs.filter(created_at__date__gte=df)
        bonuses_qs  = bonuses_qs.filter(created_at__date__gte=df)
    if dt:
        payments_qs = payments_qs.filter(created_at__date__lte=dt)
        bonuses_qs  = bonuses_qs.filter(created_at__date__lte=dt)

    # 두 QuerySet을 하나의 리스트로 병합해 날짜 역순 정렬
    charge_rows = []
    for p in payments_qs:
        charge_rows.append({
            'kind':          'payment',
            'created_at':    p.created_at,
            'label':         f'{p.plan.credit_amount:,}C 충전',
            'credit_amount': p.plan.credit_amount,
            'price':         p.amount,
            'status':        p.status,
            'payment_id':    p.payment_id,
            'cancelable':    p.status == 'PAID' and p.created_at > cutoff,
        })
    for b in bonuses_qs:
        charge_rows.append({
            'kind':          'bonus',
            'created_at':    b.created_at,
            'label':         b.feature_name,
            'credit_amount': b.change_amount,
            'price':         0,
            'status':        'FREE',
        })
    charge_rows.sort(key=lambda r: r['created_at'], reverse=True)

    # ── 사용 내역 ──
    usages_qs = CreditTransaction.objects.filter(user=request.user, transaction_type='USE').order_by('-created_at')
    if df:
        usages_qs = usages_qs.filter(created_at__date__gte=df)
    if dt:
        usages_qs = usages_qs.filter(created_at__date__lte=dt)

    charges_page = Paginator(charge_rows, 10).get_page(page if tab == 'charge' else 1)
    usages_page  = Paginator(usages_qs,   10).get_page(page if tab == 'usage'  else 1)

    return render(request, 'credits/credit_history.html', {
        'charges':    charges_page,
        'usages':     usages_page,
        'cutoff':     cutoff,
        'active_tab': tab,
        'today':      today,
        'date_from':  date_from,
        'date_to':    date_to,
    })

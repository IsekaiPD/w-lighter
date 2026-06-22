from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from works.models import Work


@login_required(login_url='pages:landing')
def localization(request):
    works = Work.objects.filter(user=request.user).order_by('-created_at')
    return render(request, 'guides/localization.html', {'works': works})

from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from works.models import Work


@login_required(login_url='pages:landing')
def cover_image(request):
    works = Work.objects.filter(user=request.user).order_by('-created_at')
    return render(request, 'covers/cover_image.html', {'works': works})

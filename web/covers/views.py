from django.contrib.auth.decorators import login_required
from django.shortcuts import render


@login_required(login_url='pages:landing')
def cover_image(request):
    return render(request, 'covers/cover_image.html')

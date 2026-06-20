from django.shortcuts import render


def cover_image(request):
    return render(request, 'covers/cover_image.html')

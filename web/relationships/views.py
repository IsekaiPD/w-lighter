from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from works.models import Work


@login_required(login_url='pages:landing')
def relationship(request):
    works = Work.objects.filter(user=request.user).order_by('-created_at')
    return render(request, 'relationships/relationship.html', {'works': works})

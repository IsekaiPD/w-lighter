from django.shortcuts import render


def relationship(request):
    return render(request, 'relationships/relationship.html')

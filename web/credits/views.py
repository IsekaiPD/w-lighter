from django.shortcuts import render

def credit_charge(request):
    return render(request, 'credits/credit_charge.html')

def credit_history(request):
    return render(request, 'credits/credit_history.html')
from django.urls import path
from . import views

app_name = 'characters'

urlpatterns = [
    path('characters/', views.character_list, name='list'),
    path('characters/extract/', views.character_extract, name='extract'),
]

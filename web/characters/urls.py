from django.urls import path
from . import views

app_name = 'characters'

urlpatterns = [
    path('works/<int:work_pk>/characters/', views.character_list, name='list'),   # → /characters/works/1/
]


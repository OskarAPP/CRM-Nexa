<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    // Campos asignables
    protected $fillable = [
        'nombres',
        'apellidos',
        'numero_telefonico',
        'email',
        'password',
        'estado',
        'municipio',
        'direccion',
        'email_verified_at',
    ];

    // Campos ocultos al serializar
    protected $hidden = [
        'password',
    ];

    // Casts
    protected $casts = [
        'email_verified_at' => 'datetime',
    ];

    // Si quieres un getter para "name" (opcional)
    public function getNameAttribute()
    {
        return trim("{$this->nombres} {$this->apellidos}");
    }
}

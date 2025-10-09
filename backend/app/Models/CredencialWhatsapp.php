<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CredencialWhatsapp extends Model
{
    use HasFactory;

    protected $table = 'credenciales_whatsapp';

    protected $fillable = [
        'user_id',
        'instancia',
        'apikey'
    ];
}

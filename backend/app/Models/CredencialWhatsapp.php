<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class CredencialWhatsapp extends Model
{
    use HasFactory;

    protected $table = 'credenciales_whatsapp';

    protected $fillable = [
        'user_id',
        'instancia',
        'apikey'
    ];

    protected $hidden = [
        'instancia',
        'apikey',
    ];

    public function getInstanciaAttribute($value): ?string
    {
        return $this->decryptAttributeValue($value);
    }

    public function setInstanciaAttribute($value): void
    {
        $this->attributes['instancia'] = $this->encryptAttributeValue($value);
    }

    public function getApikeyAttribute($value): ?string
    {
        return $this->decryptAttributeValue($value);
    }

    public function setApikeyAttribute($value): void
    {
        $this->attributes['apikey'] = $this->encryptAttributeValue($value);
    }

    protected function encryptAttributeValue($value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return Crypt::encryptString((string) $value);
    }

    protected function decryptAttributeValue($value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        try {
            return Crypt::decryptString($value);
        } catch (\Throwable $exception) {
            return $value;
        }
    }
}

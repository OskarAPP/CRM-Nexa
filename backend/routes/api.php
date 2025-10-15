<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\CredencialWhatsappController;

Route::prefix('credenciales-whatsapp')->group(function () {
    Route::get('/', [CredencialWhatsappController::class, 'index']);
    Route::post('/', [CredencialWhatsappController::class, 'store']);
});


Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);


    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/perfil', [AuthController::class, 'perfil']); // ejemplo

Route::post('/find-contacts', [ContactController::class, 'findContacts']);
Route::post('/filter-contacts', [ContactController::class, 'filterContacts']);
Route::post('/send-message', [MessageController::class, 'sendMessage']);
Route::post('/send-media', [MessageController::class, 'sendMedia']);

<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\CredencialWhatsappController;
use App\Http\Controllers\InstanceController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\PlantillaController;
use App\Http\Controllers\UsuarioController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);


Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/login/status', [AuthController::class, 'whatsappStatus']);
    Route::get('/instance/connectionState/{instance}', [InstanceController::class, 'connectionState']);
    Route::get('/perfil', [AuthController::class, 'perfil']); // ejemplo

    
    Route::post('/find-contacts', [ContactController::class, 'findContacts']);
    Route::post('/filter-contacts', [ContactController::class, 'filterContacts']);
    Route::post('/send-message', [MessageController::class, 'sendMessage']);
    Route::post('/send-media', [MessageController::class, 'sendMedia']);

    Route::get('/plantillas', [PlantillaController::class, 'index']);
    Route::get('/plantillas/{id}', [PlantillaController::class, 'show']);
    Route::post('/plantillas', [PlantillaController::class, 'store']);
    Route::put('/plantillas/{id}', [PlantillaController::class, 'update']);
    Route::delete('/plantillas/{id}', [PlantillaController::class, 'destroy']);

    Route::apiResource('credenciales-whatsapp', CredencialWhatsappController::class)->only([
        'index', 'store', 'show', 'update', 'destroy'
    ]);

    Route::apiResource('usuarios', UsuarioController::class)->only([
        'index', 'store', 'show', 'update', 'destroy'
    ]);
});

Route::prefix('usuarios')->group(function () {
    Route::post('/register', [UsuarioController::class, 'register']);
    Route::post('/login', [UsuarioController::class, 'login']);
});

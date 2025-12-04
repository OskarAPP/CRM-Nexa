<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\CredencialWhatsappController;
use App\Http\Controllers\InstanceController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\PlantillaController;
use App\Http\Controllers\UsuarioController;

Route::middleware(['web'])->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:register');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

    Route::prefix('usuarios')->group(function () {
        Route::post('/register', [UsuarioController::class, 'register'])->middleware('throttle:register');
        Route::post('/login', [UsuarioController::class, 'login'])->middleware('throttle:login');
    });
});


Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/login/status', [AuthController::class, 'whatsappStatus']);
    Route::get('/instance/connectionState/{instance}', [InstanceController::class, 'connectionState']);
    Route::get('/perfil', [AuthController::class, 'perfil']); // ejemplo

    
    Route::post('/find-contacts', [ContactController::class, 'findContacts'])->middleware('throttle:messaging');
    Route::post('/filter-contacts', [ContactController::class, 'filterContacts'])->middleware('throttle:messaging');
    Route::post('/send-message', [MessageController::class, 'sendMessage'])->middleware('throttle:messaging');
    Route::post('/send-media', [MessageController::class, 'sendMedia'])->middleware('throttle:messaging');

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



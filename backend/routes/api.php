<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\ContactController;

Route::post('/find-contacts', [ContactController::class, 'findContacts']);
Route::post('/send-message', [MessageController::class, 'sendMessage']);
Route::post('/send-media', [MessageController::class, 'sendMedia']); // Nueva ruta
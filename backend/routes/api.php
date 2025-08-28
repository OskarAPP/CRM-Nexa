<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\MessageController;

Route::post('/send-message', [MessageController::class, 'sendMessage']);

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            // Si tienes campo 'name' lo renombramos a 'nombres'
            if (Schema::hasColumn('users', 'name')) {
                // Nota: renameColumn requiere doctrine/dbal
                $table->renameColumn('name', 'nombres');
            } else {
                $table->string('nombres')->nullable();
            }

            // Agregar otros campos si no existen
            if (! Schema::hasColumn('users', 'apellidos')) {
                $table->string('apellidos')->nullable();
            }
            if (! Schema::hasColumn('users', 'numero_telefonico')) {
                $table->string('numero_telefonico', 20)->nullable();
            }
            if (! Schema::hasColumn('users', 'estado')) {
                $table->string('estado', 100)->nullable();
            }
            if (! Schema::hasColumn('users', 'municipio')) {
                $table->string('municipio', 100)->nullable();
            }
            if (! Schema::hasColumn('users', 'direccion')) {
                $table->text('direccion')->nullable();
            }
            if (! Schema::hasColumn('users', 'email_verified_at')) {
                $table->timestamp('email_verified_at')->nullable();
            }
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            // Opcional: quitar columnas (ten cuidado con datos)
            if (Schema::hasColumn('users', 'apellidos')) $table->dropColumn('apellidos');
            if (Schema::hasColumn('users', 'numero_telefonico')) $table->dropColumn('numero_telefonico');
            if (Schema::hasColumn('users', 'estado')) $table->dropColumn('estado');
            if (Schema::hasColumn('users', 'municipio')) $table->dropColumn('municipio');
            if (Schema::hasColumn('users', 'direccion')) $table->dropColumn('direccion');
            // no renombramos 'nombres' de vuelta por seguridad
        });
    }
};

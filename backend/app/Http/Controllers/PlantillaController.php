<?php

namespace App\Http\Controllers;

use App\Models\Plantilla;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PlantillaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $usuario = $request->user();

        $plantillas = Plantilla::where('user_id', $usuario->id)
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (Plantilla $plantilla) => $this->formatPlantilla($plantilla));

        return response()->json([
            'data' => $plantillas,
        ]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $plantilla = Plantilla::find($id);

        if (! $plantilla || $plantilla->user_id !== $request->user()->id) {
            return response()->json([
                'message' => 'Plantilla no encontrada.',
            ], 404);
        }

        return response()->json([
            'data' => $this->formatPlantilla($plantilla),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $usuario = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string'],
            'type' => ['required', Rule::in(['texto', 'media'])],
            'payload' => ['required', 'array'],
        ]);

        $payload = $this->validatePayload($validated['type'], $validated['payload']);

        $plantilla = Plantilla::create(array_merge(
            $this->mapPayloadToColumns($validated['type'], $payload),
            [
                'id' => (string) Str::uuid(),
                'user_id' => $usuario->id,
                'name' => $validated['name'],
                'description' => $validated['description'] ?? '',
                'type' => $validated['type'],
            ],
        ));

        $plantilla->refresh();

        return response()->json([
            'message' => 'Plantilla creada correctamente.',
            'data' => $this->formatPlantilla($plantilla),
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $plantilla = Plantilla::find($id);

        if (! $plantilla || $plantilla->user_id !== $request->user()->id) {
            return response()->json([
                'message' => 'Plantilla no encontrada.',
            ], 404);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'description' => ['nullable', 'string'],
            'type' => ['sometimes', Rule::in(['texto', 'media'])],
            'payload' => ['sometimes', 'required', 'array'],
        ]);

        $type = $validated['type'] ?? $plantilla->type;
        $typeIsChanging = array_key_exists('type', $validated) && $validated['type'] !== $plantilla->type;

        if ($typeIsChanging && ! array_key_exists('payload', $validated)) {
            return response()->json([
                'message' => 'Debe proporcionar el payload completo al cambiar el tipo de plantilla.',
            ], 422);
        }

        if (array_key_exists('payload', $validated)) {
            $payload = $this->validatePayload($type, $validated['payload']);
        } else {
            $payload = $this->mapColumnsToPayload($plantilla);
        }

        $columns = $this->mapPayloadToColumns($type, $payload);

        $updates = $columns;

        if (array_key_exists('name', $validated)) {
            $updates['name'] = $validated['name'];
        }

        if (array_key_exists('description', $validated)) {
            $updates['description'] = $validated['description'] ?? '';
        }

        if (array_key_exists('type', $validated)) {
            $updates['type'] = $type;
        }

        $plantilla->fill($updates);
        $plantilla->save();

        return response()->json([
            'message' => 'Plantilla actualizada correctamente.',
            'data' => $this->formatPlantilla($plantilla->fresh()),
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $plantilla = Plantilla::find($id);

        if (! $plantilla || $plantilla->user_id !== $request->user()->id) {
            return response()->json([
                'message' => 'Plantilla no encontrada.',
            ], 404);
        }

        $plantilla->delete();

        return response()->json([
            'message' => 'Plantilla eliminada correctamente.',
        ], 200);
    }

    protected function validatePayload(string $type, array $payload): array
    {
        if ($type === 'texto') {
            $validator = Validator::make($payload, [
                'numeros' => ['required', 'string'],
                'mensaje' => ['required', 'string'],
                'isManual' => ['required', 'boolean'],
            ]);

            return $validator->validate();
        }

        $validator = Validator::make($payload, [
            'numeros' => ['required', 'string'],
            'caption' => ['nullable', 'string'],
            'fileName' => ['required', 'string', 'max:255'],
            'mediaBase64' => ['required', 'string'],
            'mediaType' => ['required', Rule::in(['image', 'video', 'audio', 'document'])],
            'mimeType' => ['nullable', 'string', 'max:100'],
            'isManual' => ['required', 'boolean'],
        ]);

        return $validator->validate();
    }

    protected function mapPayloadToColumns(string $type, array $payload): array
    {
        if ($type === 'texto') {
            return [
                'numeros' => $payload['numeros'],
                'is_manual' => (bool) $payload['isManual'],
                'mensaje' => $payload['mensaje'],
                'caption' => null,
                'file_name' => null,
                'media_base64' => null,
                'media_type' => null,
                'mime_type' => null,
            ];
        }

        return [
            'numeros' => $payload['numeros'],
            'is_manual' => (bool) $payload['isManual'],
            'mensaje' => null,
            'caption' => $payload['caption'] ?? '',
            'file_name' => $payload['fileName'],
            'media_base64' => $payload['mediaBase64'],
            'media_type' => $payload['mediaType'],
            'mime_type' => $payload['mimeType'] ?? null,
        ];
    }

    protected function mapColumnsToPayload(Plantilla $plantilla): array
    {
        if ($plantilla->type === 'texto') {
            return [
                'numeros' => $plantilla->numeros ?? '',
                'mensaje' => $plantilla->mensaje ?? '',
                'isManual' => (bool) $plantilla->is_manual,
            ];
        }

        return [
            'numeros' => $plantilla->numeros ?? '',
            'caption' => $plantilla->caption ?? '',
            'fileName' => $plantilla->file_name ?? '',
            'mediaBase64' => $plantilla->media_base64 ?? '',
            'mediaType' => $plantilla->media_type ?? 'document',
            'mimeType' => $plantilla->mime_type ?? null,
            'isManual' => (bool) $plantilla->is_manual,
        ];
    }

    protected function formatPlantilla(Plantilla $plantilla): array
    {
        $base = [
            'id' => $plantilla->id,
            'userId' => $plantilla->user_id,
            'name' => $plantilla->name,
            'description' => $plantilla->description ?? '',
            'type' => $plantilla->type,
            'createdAt' => optional($plantilla->created_at)->toIso8601String(),
            'updatedAt' => optional($plantilla->updated_at)->toIso8601String(),
        ];

        return array_merge($base, [
            'payload' => $this->mapColumnsToPayload($plantilla),
        ]);
    }
}

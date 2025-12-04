<?php

namespace App\Http\Controllers;

use App\Models\CredencialWhatsapp;
use GuzzleHttp\Client;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    protected string $evolutionBaseUrl;

    public function __construct()
    {
        $this->evolutionBaseUrl = rtrim(config('services.evolution.base_url'), '/');
    }

            public function findContacts(Request $request)
        {
            try {
                $user = $request->user();

                if (! $user) {
                    return response()->json([
                        'error' => true,
                        'message' => 'Usuario no autenticado.'
                    ], 401);
                }

                $credencial = CredencialWhatsapp::where('user_id', $user->id)->first();

                if (!$credencial) {
                    return response()->json([
                        'error' => true,
                        'message' => 'No se encontraron credenciales de WhatsApp para el usuario especificado.'
                    ], 404);
                }

                // ✅ Extraer los valores desde la BD
                $instanceName = $credencial->instancia;
                $apiKey = $credencial->apikey;
                $apiUrl = sprintf('%s/chat/findContacts/%s', $this->evolutionBaseUrl, $instanceName);

                // ✅ Consumir la API externa con Guzzle
                $client = new Client();
                $response = $client->post($apiUrl, [
                    'headers' => [
                        'apikey' => $apiKey,
                        'Accept' => 'application/json'
                    ],
                    'json' => [
                        "where" => (object)[] // si se desea, aquí podrían agregarse filtros
                    ]
                ]);

                // ✅ Decodificar la respuesta
                $data = json_decode($response->getBody(), true);

                return response()->json($data);

            } catch (\Exception $e) {
                return response()->json([
                    "error" => true,
                    "message" => $e->getMessage()
                ], 500);
            }
        }




    /**
     * Método mejorado: filtra contactos por country_code y múltiples area_codes.
     * - country_code por defecto = '521' (México) si no se envía.
     * - area_codes opcional (array de códigos de área: ['999', '981', '996'])
     *
     * Request JSON esperado (ejemplo):
     * {
     *   "country_code": "521",
     *   "area_codes": ["999", "981", "996"]
     * }
     */
            public function filterContacts(Request $request)
        {
            try {
                $user = $request->user();

                if (! $user) {
                    return response()->json([
                        'error' => true,
                        'message' => 'Usuario no autenticado.'
                    ], 401);
                }

                $credencial = CredencialWhatsapp::where('user_id', $user->id)->first();

                if (!$credencial) {
                    return response()->json([
                        'error' => true,
                        'message' => 'No se encontraron credenciales de WhatsApp para el usuario especificado.'
                    ], 404);
                }

                // ✅ Extraer los valores desde la BD
                $instanceName = $credencial->instancia;
                $apiKey = $credencial->apikey;
                $apiUrl = sprintf('%s/chat/findContacts/%s', $this->evolutionBaseUrl, $instanceName);

                // ✅ Tomar filtros desde la solicitud
                $country = $request->input('country_code', '521'); // México por defecto
                $areaCodes = $request->input('area_codes', []);

                // Validaciones básicas
                if (!preg_match('/^\d+$/', (string)$country)) {
                    return response()->json(['error' => true, 'message' => 'country_code debe contener sólo dígitos.'], 422);
                }

                if (!is_array($areaCodes)) {
                    if (is_string($areaCodes)) {
                        $areaCodes = array_map('trim', explode(',', $areaCodes));
                    } else {
                        $areaCodes = [];
                    }
                }

                foreach ($areaCodes as $area) {
                    if (!preg_match('/^\d+$/', (string)$area)) {
                        return response()->json(['error' => true, 'message' => 'Todos los area_codes deben contener sólo dígitos.'], 422);
                    }
                }

                // ✅ Consumir la API externa
                $client = new Client();
                $response = $client->post($apiUrl, [
                    'headers' => [
                        'apikey' => $apiKey,
                        'Accept' => 'application/json'
                    ],
                    'json' => [
                        "where" => (object)[] // traer todos y filtrar localmente
                    ]
                ]);

                $data = json_decode($response->getBody(), true);

                // ✅ Extraer JIDs y filtrar por country/area
                $jids = $this->extractJidsFromArray($data);
                $filtered = [];

                foreach ($jids as $jid) {
                    $left = explode('@', $jid)[0];
                    if (strpos($left, (string)$country) !== 0) continue;

                    $afterCountry = substr($left, strlen((string)$country));
                    if ($afterCountry === '') continue;

                    if (!empty($areaCodes)) {
                        $areaFound = null;
                        foreach ($areaCodes as $area) {
                            if (strpos($afterCountry, (string)$area) === 0) {
                                $areaFound = (string)$area;
                                break;
                            }
                        }
                        if ($areaFound === null) continue;
                        $local = substr($afterCountry, strlen($areaFound));
                    } else {
                        $areaFound = substr($afterCountry, 0, 3);
                        $local = substr($afterCountry, 3);
                    }

                    $filtered[] = [
                        'jid' => $jid,
                        'country_code' => (string)$country,
                        'area_code' => $areaFound,
                        'local_number' => $local
                    ];
                }

                // ✅ Asociar con objetos de contacto completos
                $filteredJids = array_map(fn($f) => $f['jid'], $filtered);
                $matchedContacts = $this->findObjectsContainingJids($data, $filteredJids);

                return response()->json([
                    'error' => false,
                    'total_jids_found' => count($jids),
                    'filtered_count' => count($filtered),
                    'filters_applied' => [
                        'country_code' => $country,
                        'area_codes' => $areaCodes
                    ],
                    'filtered' => $filtered,
                    'matched_contacts' => array_values($matchedContacts)
                ]);

            } catch (\Exception $e) {
                return response()->json([
                    "error" => true,
                    "message" => $e->getMessage()
                ], 500);
            }
        }


    /**
     * Busca recursivamente cadenas que sean JIDs (números + @s.whatsapp.net o @g.us).
     * Devuelve lista única de JIDs encontrados.
     */
    private function extractJidsFromArray($data)
    {
        $jids = [];

        if (is_string($data)) {
            if (preg_match_all('/\b[0-9]+@(?:s\.whatsapp\.net|g\.us)\b/', $data, $matches)) {
                $jids = array_merge($jids, $matches[0]);
            }
            return array_values(array_unique($jids));
        }

        if (is_array($data)) {
            foreach ($data as $value) {
                if (is_string($value)) {
                    if (preg_match_all('/\b[0-9]+@(?:s\.whatsapp\.net|g\.us)\b/', $value, $matches)) {
                        $jids = array_merge($jids, $matches[0]);
                    }
                } elseif (is_array($value) || is_object($value)) {
                    $jids = array_merge($jids, $this->extractJidsFromArray($value));
                }
            }
        }

        return array_values(array_unique($jids));
    }

    /**
     * Busca recursivamente arrays/objetos que contengan alguno de los JIDs pasados.
     * Devuelve los arrays encontrados (posibles objetos de contacto).
     */
    private function findObjectsContainingJids($data, array $jids)
    {
        $found = [];

        if (!is_array($data)) {
            return $found;
        }

        foreach ($data as $key => $value) {
            // Si el elemento es un array asociativo, comprobar si alguno de sus valores es un jid
            if (is_array($value)) {
                foreach ($value as $v) {
                    if (is_string($v) && in_array($v, $jids, true)) {
                        $found[] = $value;
                        // si ya lo agregamos, no necesitamos revisar más campos de este array
                        continue 2;
                    }
                }
                // buscar más profundo
                $found = array_merge($found, $this->findObjectsContainingJids($value, $jids));
            }
        }

        // eliminar duplicados (por coincidencias recursivas)
        // usar serialize para comparar arrays
        $unique = [];
        $serialized = [];
        foreach ($found as $f) {
            $s = serialize($f);
            if (!in_array($s, $serialized, true)) {
                $serialized[] = $s;
                $unique[] = $f;
            }
        }

        return $unique;
    }
}
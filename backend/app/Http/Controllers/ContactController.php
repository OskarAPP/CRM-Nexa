<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use GuzzleHttp\Client;

class ContactController extends Controller
{
    public function findContacts(Request $request)
    {
        $instanceName = "Chalino"; // 👈 Cambia el nombre de tu instancia
        $apiKey = "5CB5FA7385FE-4BEB-92BD-B8BC1EB841AA"; // 👈 Tu API Key
        $apiUrl = "https://nexa-evolution-api.yyfvlz.easypanel.host/chat/findContacts/{$instanceName}";

        try {
            $client = new Client();

            $response = $client->post($apiUrl, [
                'headers' => [
                    'apikey' => $apiKey,
                    'Accept' => 'application/json'
                ],
                'json' => [
                    "where" => (object)[] // 👈 Si la API necesita filtros, aquí los agregas
                ]
            ]);

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
     * Nuevo método: filtra contactos por country_code y area_code.
     * - country_code por defecto = '521' (México) si no se envía.
     * - area_code opcional (ej. '996' para Campeche).
     *
     * Request JSON esperado (ejemplo):
     * {
     *   "country_code": "521",
     *   "area_code": "996"
     * }
     */
    public function filterContacts(Request $request)
    {
        $instanceName = "Chalino";
        $apiKey = "5CB5FA7385FE-4BEB-92BD-B8BC1EB841AA";
        $apiUrl = "https://nexa-evolution-api.yyfvlz.easypanel.host/chat/findContacts/{$instanceName}";

        // Por defecto usamos México (521) como pediste
        $country = $request->input('country_code', '521');
        $area = $request->input('area_code', null);

        // Validaciones básicas
        if (!preg_match('/^\d+$/', (string)$country)) {
            return response()->json(['error' => true, 'message' => 'country_code debe contener sólo dígitos.'], 422);
        }
        if ($area !== null && !preg_match('/^\d+$/', (string)$area)) {
            return response()->json(['error' => true, 'message' => 'area_code debe contener sólo dígitos.'], 422);
        }

        try {
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

            // Extraer todos los JIDs (ej: 5219961046769@s.whatsapp.net) de la respuesta
            $jids = $this->extractJidsFromArray($data);

            $filtered = [];
            foreach ($jids as $jid) {
                $left = explode('@', $jid)[0]; // 5219961046769
                // debe empezar por el country
                if (strpos($left, (string)$country) !== 0) {
                    continue;
                }

                $afterCountry = substr($left, strlen((string)$country));
                if ($afterCountry === '') {
                    continue;
                }

                if ($area !== null) {
                    // comprobar que tras el country venga el area indicado
                    if (strpos($afterCountry, (string)$area) !== 0) {
                        continue;
                    }
                    $areaFound = (string)$area;
                    $local = substr($afterCountry, strlen((string)$area));
                } else {
                    // si no se pasó area, proponemos una "candidate" con los primeros 3 dígitos tras el country
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

            // Intentar localizar objetos de contacto en el JSON que contengan esos JIDs
            $filteredJids = array_map(function ($f) { return $f['jid']; }, $filtered);
            $matchedContacts = $this->findObjectsContainingJids($data, $filteredJids);

            return response()->json([
                'error' => false,
                'total_jids_found' => count($jids),
                'filtered_count' => count($filtered),
                'filtered' => $filtered,
                'matched_contacts' => array_values($matchedContacts) // objetos completos (si existen en la respuesta)
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

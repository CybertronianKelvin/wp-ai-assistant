<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class WP_AI_Api {

    public static function ask( string $prompt, string $system_prompt = '', int $timeout = 60 ): string|\WP_Error {
        // AI calls can take a while — extend PHP execution time beyond the default 30s.
        set_time_limit( 120 );

        $settings = get_option( 'wp_ai_assistant_settings', [] );
        $provider   = $settings['provider']   ?? 'openai';
        $api_key    = $settings['api_key']    ?? '';
        $model      = $settings['model']      ?? 'gpt-4o-mini';
        $custom_url = $settings['custom_url'] ?? '';

        if ( empty( $api_key ) ) {
            return new \WP_Error( 'no_api_key', 'No API key configured.' );
        }

        if ( 'anthropic' === $provider ) {
            return self::call_anthropic( $prompt, $system_prompt, $api_key, $model, $timeout );
        }

        $endpoint = match ( $provider ) {
            'gemini'     => 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
            'openrouter' => 'https://openrouter.ai/api/v1/chat/completions',
            'custom'     => ( ! empty( $custom_url ) ? $custom_url : 'https://api.openai.com/v1/chat/completions' ),
            default      => 'https://api.openai.com/v1/chat/completions',
        };

        $extra_headers = ( 'openrouter' === $provider )
            ? [ 'HTTP-Referer' => get_site_url() ]
            : [];

        return self::call_openai_compatible( $prompt, $system_prompt, $api_key, $model, $endpoint, $extra_headers, $timeout );
    }

    private static function call_openai_compatible(
        string $prompt,
        string $system_prompt,
        string $api_key,
        string $model,
        string $endpoint,
        array  $extra_headers = [],
        int    $timeout = 60
    ): string|\WP_Error {
        $messages = [];
        if ( ! empty( $system_prompt ) ) {
            $messages[] = [ 'role' => 'system', 'content' => $system_prompt ];
        }
        $messages[] = [ 'role' => 'user', 'content' => $prompt ];

        $body = [
            'model'       => $model,
            'messages'    => $messages,
            'max_tokens'  => 2000,
            'temperature' => 0.7,
        ];

        $headers = array_merge(
            [
                'Authorization' => 'Bearer ' . $api_key,
                'Content-Type'  => 'application/json',
            ],
            $extra_headers
        );

        $response = wp_remote_post( $endpoint, [
            'headers' => $headers,
            'body'    => wp_json_encode( $body ),
            'timeout' => $timeout,
        ] );

        return self::parse_response( $response, 'openai' );
    }

    private static function call_anthropic(
        string $prompt,
        string $system_prompt,
        string $api_key,
        string $model,
        int    $timeout = 60
    ): string|\WP_Error {
        $body = [
            'model'      => $model,
            'max_tokens' => 2000,
            'messages'   => [
                [ 'role' => 'user', 'content' => $prompt ],
            ],
        ];

        if ( ! empty( $system_prompt ) ) {
            $body['system'] = $system_prompt;
        }

        $response = wp_remote_post( 'https://api.anthropic.com/v1/messages', [
            'headers' => [
                'x-api-key'         => $api_key,
                'anthropic-version' => '2023-06-01',
                'Content-Type'      => 'application/json',
            ],
            'body'    => wp_json_encode( $body ),
            'timeout' => $timeout,
        ] );

        return self::parse_response( $response, 'anthropic' );
    }

    private static function parse_response( mixed $response, string $provider ): string|\WP_Error {
        if ( is_wp_error( $response ) ) {
            return $response;
        }

        $code = wp_remote_retrieve_response_code( $response );
        $body = wp_remote_retrieve_body( $response );
        $data = json_decode( $body, true );

        if ( 401 === $code ) {
            return new \WP_Error( 'invalid_api_key', 'Invalid API key.', [ 'status' => 401 ] );
        }

        if ( 429 === $code ) {
            return new \WP_Error( 'rate_limited', 'Rate limit exceeded.', [ 'status' => 429 ] );
        }

        if ( 200 !== $code ) {
            $message = $data['error']['message'] ?? "API error (HTTP $code).";
            return new \WP_Error( 'api_error', $message, [ 'status' => $code ] );
        }

        if ( 'anthropic' === $provider ) {
            return $data['content'][0]['text'] ?? new \WP_Error( 'parse_error', 'Unexpected Anthropic response format.' );
        }

        return $data['choices'][0]['message']['content'] ?? new \WP_Error( 'parse_error', 'Unexpected OpenAI response format.' );
    }
}

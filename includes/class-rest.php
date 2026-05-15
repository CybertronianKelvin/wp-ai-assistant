<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class WP_AI_Rest {

    public function __construct() {
        add_action( 'rest_api_init', [ $this, 'register_routes' ] );
    }

    public function register_routes(): void {
        $namespace = 'wp-ai-assistant/v1';

        register_rest_route( $namespace, '/bug', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'handle_bug' ],
            'permission_callback' => fn() => current_user_can( 'manage_options' ),
            'args'                => [
                'error_text' => [
                    'required'          => true,
                    'sanitize_callback' => 'sanitize_textarea_field',
                ],
            ],
        ] );

        register_rest_route( $namespace, '/content', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'handle_content' ],
            'permission_callback' => fn() => current_user_can( 'edit_posts' ),
            'args'                => [
                'prompt'       => [
                    'required'          => true,
                    'sanitize_callback' => 'sanitize_textarea_field',
                ],
                'content_type' => [
                    'required'          => true,
                    'sanitize_callback' => 'sanitize_text_field',
                    'validate_callback' => fn( $v ) => in_array( $v, [
                        'blog_post', 'blog_post_intro', 'product_description', 'social_caption', 'page_intro', 'email',
                    ], true ),
                ],
                'tone' => [
                    'required'          => true,
                    'sanitize_callback' => 'sanitize_text_field',
                    'validate_callback' => fn( $v ) => in_array( $v, [
                        'professional', 'casual', 'persuasive', 'friendly', 'formal',
                    ], true ),
                ],
                'word_count' => [
                    'default'           => 300,
                    'sanitize_callback' => 'absint',
                    'validate_callback' => fn( $v ) => $v >= 50 && $v <= 1500,
                ],
            ],
        ] );

        register_rest_route( $namespace, '/debug-log', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'handle_debug_log' ],
            'permission_callback' => fn() => current_user_can( 'manage_options' ),
        ] );

        register_rest_route( $namespace, '/enable-debug-log', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'enable_debug_log' ],
            'permission_callback' => fn() => current_user_can( 'manage_options' ),
        ] );

        register_rest_route( $namespace, '/test', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'handle_test' ],
            'permission_callback' => fn() => current_user_can( 'manage_options' ),
        ] );

        register_rest_route( $namespace, '/settings', [
            [
                'methods'             => 'GET',
                'callback'            => [ $this, 'get_settings' ],
                'permission_callback' => fn() => current_user_can( 'manage_options' ),
            ],
            [
                'methods'             => 'POST',
                'callback'            => [ $this, 'save_settings' ],
                'permission_callback' => fn() => current_user_can( 'manage_options' ),
                'args'                => [
                    'provider'   => [ 'sanitize_callback' => 'sanitize_text_field' ],
                    'api_key'    => [ 'sanitize_callback' => 'sanitize_text_field' ],
                    'model'      => [ 'sanitize_callback' => 'sanitize_text_field' ],
                    'custom_url' => [ 'sanitize_callback' => 'esc_url_raw' ],
                ],
            ],
        ] );
    }

    public function handle_bug( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
        $error_text = $request->get_param( 'error_text' );

        $system = "You are a WordPress debugging expert. Analyse the error or stack trace provided.\n" .
                  "Respond in clean markdown using EXACTLY these three section headings (no bold, no extra symbols):\n\n" .
                  "## What happened\n" .
                  "(2-3 sentences, plain English, no jargon)\n\n" .
                  "## Root cause\n" .
                  "(1 sentence identifying the most likely cause)\n\n" .
                  "## Suggested fix\n" .
                  "(Steps to fix it. Use fenced code blocks for any code examples.)\n\n" .
                  "Important: write the headings exactly as shown — two hashes, a space, then the title. Do not wrap them in bold or asterisks.";

        $prompt = "Here is the WordPress error:\n\n" . $error_text;

        $result = WP_AI_Api::ask( $prompt, $system );

        if ( is_wp_error( $result ) ) {
            return $result;
        }

        return rest_ensure_response( [ 'result' => $result ] );
    }

    public function handle_content( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
        $prompt       = $request->get_param( 'prompt' );
        $content_type = $request->get_param( 'content_type' );
        $tone         = $request->get_param( 'tone' );
        $word_count   = $request->get_param( 'word_count' );

        $type_label = str_replace( '_', ' ', $content_type );

        $system = "You are a professional copywriter. Write {$type_label} content.\n" .
                  "Tone: {$tone}. Target length: approximately {$word_count} words.\n" .
                  "Write only the content — no preamble, no 'here is your content' intro.\n" .
                  "Use proper formatting (headings, paragraphs) where appropriate.";

        $result = WP_AI_Api::ask( $prompt, $system );

        if ( is_wp_error( $result ) ) {
            return $result;
        }

        return rest_ensure_response( [ 'result' => $result ] );
    }

    public function handle_debug_log(): \WP_REST_Response {
        $wp_log = WP_CONTENT_DIR . '/debug.log';

        // Prefer WP debug log; fall back to PHP's configured error_log path.
        $candidates = array_filter( [
            $wp_log,
            ini_get( 'error_log' ) ?: null,
        ] );

        $found_path  = null;
        $found_label = null;
        foreach ( $candidates as $path ) {
            if ( file_exists( $path ) && is_readable( $path ) ) {
                $found_path  = $path;
                $found_label = ( $path === $wp_log ) ? 'wp-content/debug.log' : $path;
                break;
            }
        }

        if ( $found_path === null ) {
            return rest_ensure_response( [ 'lines' => [], 'exists' => false ] );
        }

        $lines = $this->read_tail( $found_path, 100 );

        return rest_ensure_response( [
            'lines'  => $lines,
            'exists' => true,
            'source' => $found_label,
        ] );
    }

    public function enable_debug_log(): \WP_REST_Response|\WP_Error {
        $log_path = WP_CONTENT_DIR . '/debug.log';

        if ( ! file_exists( $log_path ) ) {
            $created = file_put_contents( $log_path, '' );
            if ( $created === false ) {
                return new \WP_Error( 'cannot_create', 'Could not create debug.log — check wp-content is writable.' );
            }
        }

        // Write a timestamped marker so the file is non-empty.
        $stamp = current_time( 'Y-m-d H:i:s' );
        error_log( "[{$stamp}] WP AI Assistant: debug logging enabled." );

        $lines = $this->read_tail( $log_path, 100 );

        return rest_ensure_response( [
            'lines'  => $lines,
            'exists' => true,
            'source' => 'wp-content/debug.log',
        ] );
    }

    private function read_tail( string $path, int $max_lines ): array {
        // Patterns that are noise, not real site errors
        $noise = [
            'Xdebug:',
            'xdebug.client_host',
            'Step Debug',
            'WP AI Assistant: debug logging enabled',
        ];

        $file = new \SplFileObject( $path );
        $file->seek( PHP_INT_MAX );
        $total = $file->key();

        // Read from further back to account for filtered lines
        $start = max( 0, $total - ( $max_lines * 4 ) );
        $lines = [];

        $file->seek( $start );
        while ( ! $file->eof() ) {
            $line = rtrim( $file->current() );
            $file->next();

            if ( trim( $line ) === '' ) continue;

            $is_noise = false;
            foreach ( $noise as $pattern ) {
                if ( str_contains( $line, $pattern ) ) {
                    $is_noise = true;
                    break;
                }
            }

            if ( ! $is_noise ) {
                $lines[] = $line;
            }
        }

        return array_slice( $lines, -$max_lines );
    }

    public function handle_test(): \WP_REST_Response|\WP_Error {
        $result = WP_AI_Api::ask( 'Reply with the single word: ok', '', 20 );
        if ( is_wp_error( $result ) ) {
            return $result;
        }
        return rest_ensure_response( [ 'ok' => true ] );
    }

    public function get_settings(): \WP_REST_Response {
        $settings = get_option( 'wp_ai_assistant_settings', [
            'provider'   => 'openai',
            'api_key'    => '',
            'model'      => 'gpt-4o-mini',
            'custom_url' => '',
        ] );

        $api_key = $settings['api_key'] ?? '';
        if ( strlen( $api_key ) > 4 ) {
            $settings['api_key'] = '****' . substr( $api_key, -4 );
        } elseif ( ! empty( $api_key ) ) {
            $settings['api_key'] = '****';
        }

        return rest_ensure_response( $settings );
    }

    public function save_settings( \WP_REST_Request $request ): \WP_REST_Response {
        $existing = get_option( 'wp_ai_assistant_settings', [] );

        $new_key = $request->get_param( 'api_key' );
        if ( str_starts_with( $new_key ?? '', '****' ) ) {
            $new_key = $existing['api_key'] ?? '';
        }

        $data = [
            'provider'   => sanitize_text_field( $request->get_param( 'provider' ) ?? 'openai' ),
            'api_key'    => sanitize_text_field( $new_key ?? '' ),
            'model'      => sanitize_text_field( $request->get_param( 'model' ) ?? 'gpt-4o-mini' ),
            'custom_url' => esc_url_raw( $request->get_param( 'custom_url' ) ?? '' ),
        ];

        update_option( 'wp_ai_assistant_settings', $data );

        return rest_ensure_response( [ 'saved' => true ] );
    }
}

<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class WP_AI_Admin {

    private string $page_hook = '';

    public function __construct() {
        add_action( 'admin_menu', [ $this, 'register_menu' ] );
        add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_assets' ] );
        add_action( 'admin_head', [ $this, 'output_layout_css' ] );
        add_filter( 'script_loader_tag', [ $this, 'add_module_type' ], 10, 3 );
    }

    public function register_menu(): void {
        $this->page_hook = add_menu_page(
            'WP AI Assistant',
            'AI Assistant',
            'manage_options',
            'wp-ai-assistant',
            [ $this, 'render_page' ],
            'dashicons-superhero-alt',
            80
        );
    }

    public function enqueue_assets( string $hook ): void {
        if ( $hook !== $this->page_hook ) {
            return;
        }

        wp_enqueue_style(
            'wp-ai-assistant',
            WP_AI_ASSISTANT_URL . 'dist/assets/main.css',
            [],
            WP_AI_ASSISTANT_VERSION
        );

        wp_enqueue_script(
            'wp-ai-assistant',
            WP_AI_ASSISTANT_URL . 'dist/assets/main.js',
            [],
            WP_AI_ASSISTANT_VERSION,
            true
        );

        wp_localize_script( 'wp-ai-assistant', 'wpAiAssistant', [
            'restUrl'   => esc_url_raw( rest_url( 'wp-ai-assistant/v1/' ) ),
            'nonce'     => wp_create_nonce( 'wp_rest' ),
            'pluginUrl' => WP_AI_ASSISTANT_URL,
            'siteUrl'   => esc_url_raw( get_site_url() ),
            'adminUrl'  => esc_url_raw( admin_url() ),
        ] );

    }

    public function add_module_type( string $tag, string $handle, string $src ): string {
        if ( 'wp-ai-assistant' !== $handle ) {
            return $tag;
        }
        return str_replace( '<script ', '<script type="module" ', $tag );
    }

    public function output_layout_css(): void {
        $screen = get_current_screen();
        
        if ( ! $screen || $screen->id !== $this->page_hook ) {
            return;
        }

        echo '<style id="wp-ai-assistant-layout">
            #wpbody-content { padding-bottom: 0 !important; }
            #wp-ai-assistant-root { display: block; margin: 0; padding: 0; }
        </style>';
    }

    public function render_page(): void {
        echo '<div id="wp-ai-assistant-root"></div>';
    }
}

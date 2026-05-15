<?php
/**
 * Plugin Name: WP AI Assistant
 * Plugin URI: https://yoursite.com
 * Description: AI-powered bug explainer and content writer for your WordPress admin.
 * Version: 1.0.1
 * Author: CybertronianKelvin
 * Author URI: https://yoursite.com
 * License: GPL-2.0-or-later
 * Text Domain: wp-ai-assistant
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'WP_AI_ASSISTANT_VERSION', '1.0.1' );
define( 'WP_AI_ASSISTANT_PATH', plugin_dir_path( __FILE__ ) );
define( 'WP_AI_ASSISTANT_URL', plugin_dir_url( __FILE__ ) );

require_once WP_AI_ASSISTANT_PATH . 'includes/class-api.php';
require_once WP_AI_ASSISTANT_PATH . 'includes/class-admin.php';
require_once WP_AI_ASSISTANT_PATH . 'includes/class-rest.php';

add_action( 'plugins_loaded', function () {
    new WP_AI_Admin();
    new WP_AI_Rest();
} );

use strict;
use warnings;

my $primary_nav = <<'HTML';
<nav class="primary-nav" aria-label="Main navigation">
        <a href="/things-to-do/">Explore</a>
        <a href="/visiting/">Plan a visit</a>
        <a href="/whats-on/">What’s on</a>
        <a href="/local-life/">Local life</a>
        <a href="/moving-buying/">Moving &amp; buying</a>
        <a href="/about/">About</a>
      </nav>
HTML

my $footer_nav = <<'HTML';
<nav class="footer-nav" aria-label="Explore and plan">
        <p class="footer-heading">Explore and plan</p>
        <a href="/things-to-do/">Explore Point Vernon</a>
        <a href="/beaches/">Beaches and foreshore</a>
        <a href="/map-access/">Map and access</a>
        <a href="/visiting/">Plan a visit</a>
        <a href="/whats-on/">What’s on</a>
      </nav>

      <nav class="footer-nav" aria-label="Local and site information">
        <p class="footer-heading">Local and site information</p>
        <a href="/local-life/">Local life</a>
        <a href="/moving-buying/">Moving and buying</a>
        <a href="/accessibility/">Accessibility</a>
        <a href="/about/">About this site</a>
        <a href="/photo-credits/">Photo credits</a>
        <a href="/privacy/">Privacy</a>
      </nav>
HTML

my $privacy_banner = <<'HTML';
  <div class="privacy-banner" data-privacy-banner hidden role="region" aria-labelledby="privacy-banner-title">
    <div class="privacy-banner-inner">
      <div>
        <h2 id="privacy-banner-title">Help improve this guide?</h2>
        <p>Anonymous Analytics is off unless you allow it. If allowed, advertising and Analytics storage remain disabled. <a href="/privacy/">Read the privacy details</a>.</p>
      </div>
      <div class="privacy-actions">
        <button class="button button-primary" type="button" data-analytics-allow>Allow anonymous Analytics</button>
        <button class="button button-secondary" type="button" data-analytics-decline>No thanks</button>
      </div>
    </div>
  </div>
HTML

for my $path (@ARGV) {
  open my $in, '<', $path or die "Cannot read $path: $!";
  local $/;
  my $html = <$in>;
  close $in;

  my $original = $html;

  $html =~ s{
    \s*<!--\s*Privacy-limited\s+analytics:.*?-->
    \s*<script>.*?gtag\(\s*['"]consent['"].*?</script>
    \s*<script\s+async\s+src="https://www\.googletagmanager\.com/gtag/js\?id=G-003LRJYP3K"></script>
    \s*<script>.*?gtag\(\s*['"]config['"]\s*,\s*['"]G-003LRJYP3K['"].*?</script>
  }{\n}gsx;

  $html =~ s{
    \s*<!--\s*Google\s+tag\s*\(gtag\.js\)\s*-->
    \s*<script\s+async\s+src="https://www\.googletagmanager\.com/gtag/js\?id=G-003LRJYP3K"></script>
    \s*<script>.*?gtag\(\s*['"]config['"]\s*,\s*['"]G-003LRJYP3K['"].*?</script>
  }{\n}gsx;

  $html =~ s{
    \s*<script>\s*window\.dataLayer\s*=.*?gtag\(\s*['"]consent['"].*?</script>
    \s*<script\s+async\s+src="https://www\.googletagmanager\.com/gtag/js\?id=G-003LRJYP3K"></script>
    \s*<script>.*?gtag\(\s*['"]config['"]\s*,\s*['"]G-003LRJYP3K['"].*?</script>
  }{\n}gsx;

  if ($html !~ /<meta\s+name="referrer"/) {
    $html =~ s{(<meta\s+name="theme-color"[^>]*>)}{$1\n  <meta name="referrer" content="strict-origin-when-cross-origin">}s;
  }

  $html =~ s{/assets/css/style\.css(?:\?v=[^"\s>]*)?}{/assets/css/style.css?v=20260816-complete}g;
  if ($html !~ m{/assets/js/privacy\.js}) {
    $html =~ s{(\s*</head>)}{\n  <script defer src="/assets/js/privacy.js?v=20260816-complete"></script>$1}s;
  }

  $html =~ s{<a\s+class="site-brand"\s+href="/"\s+aria-label="Point Vernon Guide home">}{<a class="site-brand" href="/">}g;
  $html =~ s{<nav\s+class="primary-nav"\s+aria-label="Main navigation">.*?</nav>}{$primary_nav}gs;

  $html =~ s{
    (<div\s+class="container\s+footer-grid">\s*<div\s+class="footer-about">.*?</div>)
    \s*<nav\s+class="footer-nav".*?</nav>
    \s*<nav\s+class="footer-nav".*?</nav>
  }{$1\n\n      $footer_nav}gsx;

  if ($html !~ /data-privacy-settings/) {
    $html =~ s{(<div\s+class="container\s+footer-bottom">.*?)(<a\s+href="#main-content">Back to top</a>)}{$1<button class="footer-settings" type="button" data-privacy-settings>Privacy settings</button>\n      $2}gs;
  }

  if ($html !~ /data-privacy-banner/) {
    $html =~ s{(\s*</body>)}{\n$privacy_banner$1}s;
  }

  $html =~ s{http://www\.bom\.gov\.au/australia/tides/}{https://www.msq.qld.gov.au/tides/tide-tables.aspx}g;
  $html =~ s{https://www\.bom\.gov\.au/australia/tides/}{https://www.msq.qld.gov.au/tides/tide-tables.aspx}g;
  $html =~ s{https://www\.bom\.gov\.au/places/qld/point-vernon/}{https://www.bom.gov.au/location/australia/queensland/wide-bay-and-burnett/o1932115039-point-vernon}g;
  $html =~ s{https://jp\.translink\.com\.au/plan-your-journey/timetables/find-timetable/765}{https://jp.translink.com.au/plan-your-journey/timetables/Bus/H/765}g;

  $html =~ s{"author":\{"\@type":"Organization","name":"Point Vernon Guide"\}}{"author":{"\@type":"Organization","\@id":"https://pointvernon.com/#organization","name":"Point Vernon Guide"},"publisher":{"\@id":"https://pointvernon.com/#organization"}}g;

  next if $html eq $original;
  open my $out, '>', $path or die "Cannot write $path: $!";
  print {$out} $html;
  close $out;
}

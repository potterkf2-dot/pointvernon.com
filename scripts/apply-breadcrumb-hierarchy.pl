use strict;
use warnings;
use utf8;

my %trails = (
  'things-to-do'          => [['Explore', '/things-to-do/']],
  'beaches'               => [['Explore', '/things-to-do/'], ['Beaches and foreshore', '/beaches/']],
  'eli-creek-beach'       => [['Explore', '/things-to-do/'], ['Beaches and foreshore', '/beaches/'], ['Eli Creek beach', '/eli-creek-beach/']],
  'point-vernon-beach'    => [['Explore', '/things-to-do/'], ['Beaches and foreshore', '/beaches/'], ['Point Vernon beach', '/point-vernon-beach/']],
  'gables-point-beach'    => [['Explore', '/things-to-do/'], ['Beaches and foreshore', '/beaches/'], ['Gables Point beach', '/gables-point-beach/']],
  'gatakers-bay'          => [['Explore', '/things-to-do/'], ['Gatakers Bay', '/gatakers-bay/']],
  'walks'                 => [['Explore', '/things-to-do/'], ['Walks and cycling', '/walks/']],
  'fishing'               => [['Explore', '/things-to-do/'], ['Fishing', '/fishing/']],
  'artificial-reef'       => [['Explore', '/things-to-do/'], ['Artificial reef', '/artificial-reef/']],
  'whales'                => [['Explore', '/things-to-do/'], ['Whale watching', '/whales/']],
  'parks-playgrounds'     => [['Explore', '/things-to-do/'], ['Parks and playgrounds', '/parks-playgrounds/']],
  'parraweena-park'       => [['Explore', '/things-to-do/'], ['Parks and playgrounds', '/parks-playgrounds/'], ['Parraweena Park', '/parraweena-park/']],
  'history'               => [['Explore', '/things-to-do/'], ['History', '/history/']],
  'the-gables-history'    => [['Explore', '/things-to-do/'], ['History', '/history/'], ['The Gables', '/the-gables-history/']],
  'visiting'              => [['Plan a visit', '/visiting/']],
  'map-access'            => [['Plan a visit', '/visiting/'], ['Map and access', '/map-access/']],
  'accessibility'         => [['Plan a visit', '/visiting/'], ['Accessibility', '/accessibility/']],
  'accommodation'         => [['Plan a visit', '/visiting/'], ['Accommodation', '/accommodation/']],
  'getting-around'        => [['Plan a visit', '/visiting/'], ['Getting around', '/getting-around/']],
  'food-coffee'           => [['Plan a visit', '/visiting/'], ['Food and coffee', '/food-coffee/']],
  'tides'                 => [['Plan a visit', '/visiting/'], ['Tides', '/tides/']],
  'whats-on'              => [["What’s on", '/whats-on/']],
  'parkrun'               => [["What’s on", '/whats-on/'], ['Point Vernon parkrun', '/parkrun/']],
  'local-life'            => [['Local life', '/local-life/']],
  'local-help'            => [['Local life', '/local-life/'], ['Local help', '/local-help/']],
  'dog-friendly-foreshore'=> [['Local life', '/local-life/'], ['Dog-friendly foreshore', '/dog-friendly-foreshore/']],
  'moving-buying'         => [['Moving and buying', '/moving-buying/']],
  'property-checks'       => [['Moving and buying', '/moving-buying/'], ['Property checks', '/property-checks/']],
  'about'                 => [['About', '/about/']],
  'photo-credits'         => [['About', '/about/'], ['Photo credits', '/photo-credits/']],
  'privacy'               => [['About', '/about/'], ['Privacy', '/privacy/']],
);

sub json_escape {
  my ($value) = @_;
  $value =~ s/\\/\\\\/g;
  $value =~ s/"/\\"/g;
  return $value;
}

for my $path (@ARGV) {
  my ($slug) = $path =~ m{(?:^|/)([^/]+)/index\.html$};
  next unless $slug && exists $trails{$slug};

  open my $in, '<:encoding(UTF-8)', $path or die "Cannot read $path: $!";
  local $/;
  my $html = <$in>;
  close $in;
  my $original = $html;

  my @trail = @{$trails{$slug}};
  my @visible = ('<li><a href="/">Home</a></li>');
  for my $index (0 .. $#trail) {
    my ($name, $url) = @{$trail[$index]};
    if ($index == $#trail) {
      push @visible, qq{<li aria-current="page">$name</li>};
    } else {
      push @visible, qq{<li><a href="$url">$name</a></li>};
    }
  }
  my $visible_nav = '<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>' . join('', @visible) . '</ol></nav>';
  $html =~ s{<nav\s+class="breadcrumbs"\s+aria-label="Breadcrumb">.*?</nav>}{$visible_nav}gs;

  my @schema = ({name => 'Home', url => '/'});
  push @schema, map { {name => $_->[0], url => $_->[1]} } @trail;
  my @items;
  for my $index (0 .. $#schema) {
    my $position = $index + 1;
    my $name = json_escape($schema[$index]{name});
    my $url = 'https://pointvernon.com' . $schema[$index]{url};
    push @items, qq{{"\@type":"ListItem","position":$position,"name":"$name","item":"$url"}};
  }
  my $replacement = '"@type":"BreadcrumbList","itemListElement":[' . join(',', @items) . ']';
  $html =~ s{"\@type"\s*:\s*"BreadcrumbList"\s*,\s*"itemListElement"\s*:\s*\[[^\]]*\]}{$replacement}gs;

  next if $html eq $original;
  open my $out, '>:encoding(UTF-8)', $path or die "Cannot write $path: $!";
  print {$out} $html;
  close $out;
}

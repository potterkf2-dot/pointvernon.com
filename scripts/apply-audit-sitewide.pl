#!/usr/bin/env perl

use strict;
use warnings;
use utf8;
use File::Find;
use File::Spec;

my $root = File::Spec->rel2abs(File::Spec->catdir(File::Spec->curdir()));
my @files;

find(
  sub {
    return unless $_ eq 'index.html' || $_ eq '404.html';
    push @files, $File::Find::name;
  },
  $root
);

for my $file (@files) {
  next if $file =~ m{/(?:updates|editorial-policy)/index\.html$};
  open my $in, '<:encoding(UTF-8)', $file or die "Cannot read $file: $!\n";
  local $/;
  my $html = <$in>;
  close $in;

  my $original = $html;

  $html =~ s{(/assets/css/style\.css)(?:\?v=[^"\s>]*)?}{$1?v=20260908-design-v2}g;
  $html =~ s{(/assets/js/navigation\.js)(?:\?v=[^"\s>]*)?}{$1?v=20260908-navigation-v2}g;
  $html =~ s{(/assets/js/privacy\.js)(?:\?v=[^"\s>]*)?}{$1?v=20260908-ga4-repair-v1}g;

  # The public updates diary and feed were retired at the owner's request.
  $html =~ s{\s*<link rel="alternate" type="application/atom\+xml"[^>]*>}{}g;
  $html =~ s{<a href="/updates/">Latest updates</a>}{}g;

  # Standards live in About; do not restore a separate footer item.
  $html =~ s{<a href="/editorial-policy/">Editorial standards</a>}{}g;

  # Keep commercial and independence policy in the About page
  # instead of repeating it as boilerplate across every guide.
  $html =~ s{<p>Point Vernon Guide is an independent community website\. It is not affiliated with Fraser Coast Regional Council, any tourism body or any business\. There are no paid placements or affiliate links\.</p>}{}g;
  $html =~ s{<p>Point Vernon Guide is an independent community website\. It is not affiliated with parkrun, Fraser Coast Regional Council, any tourism body or any business\. There are no paid placements or affiliate links\.</p>}{}g;

  $html =~ s{Choose by the time you have}{Browse outing lengths}g;
  $html =~ s{<h2>Browse outing lengths</h2>}{<h2>Outing ideas by available time</h2>}g;
  $html =~ s{<p class="eyebrow">Evidence boundary</p>}{<p class="eyebrow">What the records establish</p>}g;
  $html =~ s{ESA Park has Council-listed toilets and picnic facilities}{Council lists toilets and picnic facilities at ESA Park}g;
  $html =~ s{ESA Park and Webb Park have Council-listed playgrounds}{Council lists playgrounds at ESA Park and Webb Park}g;
  $html =~ s{Council-listed features}{Features in Council’s record}g;
  $html =~ s{with a Council-listed playground, seating, basketball facility and shelter}{where Council lists a playground, seating, basketball facility and shelter}g;
  $html =~ s{Independent, free to use and supported by source links\. No paid placements or affiliate links\.}{Free to use and supported by source links.}g;
  $html =~ s{<li><strong>Commercial model</strong><span>No paid placements or affiliate links</span></li>}{<li><strong>Editorial standards</strong><span>Selection and corrections are publicly explained</span></li>}g;
  $html =~ s{<p>There are no paid rankings, affiliate links or sponsored placements\. A local business may be included when it helps answer a practical visitor question\. Inclusion is not a review, and omission is not a negative judgement\.</p>\s*<p>Business owners are welcome to correct basic factual details, but cannot buy preferred wording or placement\.</p>}{<p>A local business may be included when it helps answer a practical visitor question. Inclusion is not a review, and omission is not a negative judgement. The <a href="/about/#selection">editorial policy explains selection and commercial standards</a>.</p>\n            <p>Business owners are welcome to correct basic factual details.</p>}g;
  $html =~ s{These are local starting points; no business has paid to appear\.}{These are local starting points.}g;
  $html =~ s{<p>Point Vernon Guide does not use affiliate links, sell rankings or accept paid placement\. Operator websites are used as current starting points, but the provider remains responsible for availability, rates, facilities and booking terms\.</p>}{<p>Operator websites are used as current starting points, but the provider remains responsible for availability, rates, facilities and booking terms. Read the <a href="/about/#selection">editorial policy</a> for selection and commercial standards.</p>}g;
  $html =~ s{<li><strong>How businesses are listed</strong><span>No paid placement or affiliate links</span></li>}{<li><strong>Listing basis</strong><span>Local relevance and current sources</span></li>}g;
  $html =~ s{<a href="/parks-playgrounds/#esa">ESA Park</a> and <a href="/parks-playgrounds/#gables">The Gables</a> have Council-listed picnic facilities}{Council lists picnic facilities at <a href="/parks-playgrounds/#esa">ESA Park</a> and <a href="/parks-playgrounds/#gables">The Gables</a>}g;
  $html =~ s{<p>Point Vernon Guide does not sell rankings, accept paid placement or use affiliate links\. A listing is included because it appears to be useful within Point Vernon, not because the business has paid or provided a benefit\. Corrections and additions are assessed using the same practical standard\.</p>}{<p>A listing is included when it is useful within Point Vernon and its details can be checked. Read the <a href="/about/#selection">editorial policy</a> for selection and commercial standards.</p>}g;

  $html =~ s{\n[ \t]+\n}{\n\n}g;
  $html =~ s{â}{–}g;
  $html =~ s{â}{’}g;
  $html =~ s{Â©}{©}g;
  $html =~ s{https://www\.frasercoast\.qld\.gov\.au/Events/Cards-Hervey-Bay}{https://www.frasercoast.qld.gov.au/Community/Events-Calendar}g;
  $html =~ s{Check the current venue listing}{Check the current Council events calendar}g;

  next if $html eq $original;

  open my $out, '>:encoding(UTF-8)', $file or die "Cannot write $file: $!\n";
  print {$out} $html;
  close $out;
  print "$file\n";
}

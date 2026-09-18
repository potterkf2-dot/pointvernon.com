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
  open my $in, '<:encoding(UTF-8)', $file or die "Cannot read $file: $!\n";
  local $/;
  my $html = <$in>;
  close $in;

  my $original = $html;

  $html =~ s{(/assets/css/style\.css)(?:\?v=[^"\s>]*)?}{$1?v=20260908-design-v2}g;
  $html =~ s{(/assets/js/navigation\.js)(?:\?v=[^"\s>]*)?}{$1?v=20260908-navigation-v2}g;
  $html =~ s{(/assets/js/privacy\.js)(?:\?v=[^"\s>]*)?}{$1?v=20260908-ga4-repair-v1}g;

  if ($html !~ m{rel="alternate"\s+type="application/atom\+xml"}) {
    $html =~ s{(<link rel="canonical" href="[^"]+">)}{$1\n  <link rel="alternate" type="application/atom+xml" title="Point Vernon verified updates" href="/updates.xml">} or die "Canonical link not found in $file\n";
  }

  if ($html !~ m{<a href="/updates/">Latest updates</a>}) {
    $html =~ s{<a href="/about/">About this site</a>}{<a href="/updates/">Latest updates</a>\n        <a href="/about/">About this site</a>} or die "Footer About link not found in $file\n";
  }

  if ($html !~ m{<a href="/editorial-policy/">Editorial standards</a>}) {
    $html =~ s{<a href="/about/">About this site</a>}{<a href="/about/">About this site</a>\n        <a href="/editorial-policy/">Editorial standards</a>} or die "Footer About link not found in $file\n";
  }

  # Keep commercial and independence policy in the editorial-policy page
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
  $html =~ s{<p>There are no paid rankings, affiliate links or sponsored placements\. A local business may be included when it helps answer a practical visitor question\. Inclusion is not a review, and omission is not a negative judgement\.</p>\s*<p>Business owners are welcome to correct basic factual details, but cannot buy preferred wording or placement\.</p>}{<p>A local business may be included when it helps answer a practical visitor question. Inclusion is not a review, and omission is not a negative judgement. The <a href="/editorial-policy/#selection">editorial policy explains selection and commercial standards</a>.</p>\n            <p>Business owners are welcome to correct basic factual details.</p>}g;
  $html =~ s{These are local starting points; no business has paid to appear\.}{These are local starting points.}g;
  $html =~ s{<p>Point Vernon Guide does not use affiliate links, sell rankings or accept paid placement\. Operator websites are used as current starting points, but the provider remains responsible for availability, rates, facilities and booking terms\.</p>}{<p>Operator websites are used as current starting points, but the provider remains responsible for availability, rates, facilities and booking terms. Read the <a href="/editorial-policy/#selection">editorial policy</a> for selection and commercial standards.</p>}g;
  $html =~ s{<li><strong>How businesses are listed</strong><span>No paid placement or affiliate links</span></li>}{<li><strong>Listing basis</strong><span>Local relevance and current sources</span></li>}g;
  $html =~ s{<a href="/parks-playgrounds/#esa">ESA Park</a> and <a href="/parks-playgrounds/#gables">The Gables</a> have Council-listed picnic facilities}{Council lists picnic facilities at <a href="/parks-playgrounds/#esa">ESA Park</a> and <a href="/parks-playgrounds/#gables">The Gables</a>}g;
  $html =~ s{<p>Point Vernon Guide does not sell rankings, accept paid placement or use affiliate links\. A listing is included because it appears to be useful within Point Vernon, not because the business has paid or provided a benefit\. Corrections and additions are assessed using the same practical standard\.</p>}{<p>A listing is included when it is useful within Point Vernon and its details can be checked. Read the <a href="/editorial-policy/#selection">editorial policy</a> for selection and commercial standards.</p>}g;

  if ($file =~ m{/updates/index\.html$}) {
    $html =~ s{"dateModified":"2026-09-08"}{"dateModified":"2026-09-11"}g;
    $html =~ s{Last updated: <time datetime="2026-09-08">8 September 2026</time>}{Last updated: <time datetime="2026-09-11">11 September 2026</time>}g;
    $html =~ s{(<p class="in-page-heading">On this page</p>)}{$1<a href="#september-11-weekend">This weekend</a>} unless $html =~ m{id="september-11-weekend"};
    my $weekend = q{<section id="september-11-weekend"><p class="eyebrow"><time datetime="2026-09-11">Checked 11 September 2026 at 2 pm AEST</time></p><h2>This weekend: 12–13 September</h2><ul><li><strong>Point Vernon parkrun:</strong> the organiser advertises a free 5 km event at Point Vernon Foreshore Reserve at 7 am Saturday. Point Vernon was not on the <a href="https://www.parkrun.com.au/cancellations/">official cancellation list</a> when checked, but late cancellations remain possible, so check again before travelling. <a href="https://www.parkrun.com.au/pointvernonforeshorereserve/">Read the event details and registration requirements</a>.</li><li><strong>Cards at Hervey Bay Library:</strong> Council’s program lists a free, no-booking card-playing session from 9 am to 3 pm Saturday; children under 12 need a guardian. <a href="https://www.frasercoast.qld.gov.au/Events/Cards-Hervey-Bay">Check the current venue listing</a>.</li><li><strong>Urangan tide highlights:</strong> the official table predicts a 3.53 m high at 9:15 am and a 0.59 m low at 3:27 pm Saturday; Sunday’s predicted high is 3.49 m at 9:51 am and low is 0.76 m at 4:04 pm. Times are AEST. These are Urangan predictions, not Point Vernon observations or an assurance of access or safety. <a href="https://www.msq.qld.gov.au/_/media/tmronline/msqinternet/msqfiles/home/tides/online-tide-tables/2026/2026_queenslandtidetables.pdf">Check the Maritime Safety Queensland table</a>.</li></ul><p class="small-note">Tide source: Maritime Safety Queensland’s 2026 Queensland Tide Tables; predictions © Commonwealth of Australia 2025, Bureau of Meteorology. Predictions only; actual water levels can vary with weather. Weekend details are retained here as a dated archive.</p></section>};
    $html =~ s{(<article class="article-body update-log">)}{$1\n        $weekend} unless $html =~ m{id="september-11-weekend"};
    $html =~ s{<p class="in-page-heading">On this page</p><a href="#september-11-weekend">This weekend</a>}{<p class="in-page-heading">On this page</p><a href="#september-18-weekend">This weekend</a><a href="#september-11-weekend">12–13 September</a>} unless $html =~ m{href="#september-18-weekend"};
    my $weekend_18 = q{<section id="september-18-weekend"><p class="eyebrow"><time datetime="2026-09-18">Checked 18 September 2026 at 2 pm AEST</time></p><h2>This weekend: 19–20 September</h2><ul><li><strong>Point Vernon parkrun:</strong> the organiser advertises its free weekly 5 km event at Point Vernon Foreshore Reserve at 7 am Saturday. Point Vernon was not on the <a href="https://www.parkrun.com.au/cancellations/">official cancellation list</a> when checked, but late cancellations remain possible, so check again before travelling. <a href="https://www.parkrun.com.au/pointvernonforeshorereserve/">Read the event details and registration requirements</a>.</li><li><strong>Sounds of Rock:</strong> the official event listing schedules the ticketed festival at Seafront Oval, Pialba, from 12:30 pm to 10 pm Saturday. Its general area is all ages with conditions for patrons aged 4–17; premium admission is 18+. Check the organiser’s current entry conditions and availability before travelling. <a href="https://www.ourfrasercoast.com.au/Brolga-Theatre/Whats-On/Sounds-of-Rock-Music-FestivalbrHervey-Bay">Read the official listing</a>.</li><li><strong>Hervey Bay Library:</strong> Council’s calendar lists free chess and cards sessions at the library on Saturday. Check the current listing for times, age conditions and any booking requirements. <a href="https://www.frasercoast.qld.gov.au/Community/Events-Calendar">Open the Council events calendar</a>.</li><li><strong>Urangan tide highlights:</strong> the official table predicts a 1.57 m low at 7:51 am and a 2.80 m high at 3:26 pm Saturday; Sunday’s predicted low is 1.54 m at 9:37 am and high is 2.93 m at 4:39 pm. Times are AEST. These are Urangan predictions, not Point Vernon observations or an assurance of access or safety. <a href="https://www.msq.qld.gov.au/_/media/tmronline/msqinternet/msqfiles/home/tides/online-tide-tables/2026/2026_queenslandtidetables.pdf">Check the Maritime Safety Queensland table</a>.</li></ul><p class="small-note">Tide source: Maritime Safety Queensland’s 2026 Queensland Tide Tables; predictions © Commonwealth of Australia 2025, Bureau of Meteorology. Predictions only; actual water levels can vary with weather. Weekend details are retained here as a dated archive.</p></section>};
    $html =~ s{(<article class="article-body update-log">)}{$1\n        $weekend_18} unless $html =~ m{id="september-18-weekend"};
  }

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

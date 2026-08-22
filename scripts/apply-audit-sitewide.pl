#!/usr/bin/env perl

use strict;
use warnings;
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

  $html =~ s/\?v=20260816-complete/?v=20260822-audit/g;

  if ($html !~ m{rel="alternate"\s+type="application/atom\+xml"}) {
    $html =~ s{(<link rel="canonical" href="[^"]+">)}{$1\n  <link rel="alternate" type="application/atom+xml" title="Point Vernon verified updates" href="/updates.xml">} or die "Canonical link not found in $file\n";
  }

  if ($html !~ m{<a href="/updates/">Latest updates</a>}) {
    $html =~ s{<a href="/about/">About this site</a>}{<a href="/updates/">Latest updates</a>\n        <a href="/about/">About this site</a>} or die "Footer About link not found in $file\n";
  }

  if ($html !~ m{<a href="/editorial-policy/">Editorial standards</a>}) {
    $html =~ s{<a href="/about/">About this site</a>}{<a href="/about/">About this site</a>\n        <a href="/editorial-policy/">Editorial standards</a>} or die "Footer About link not found in $file\n";
  }

  next if $html eq $original;

  open my $out, '>:encoding(UTF-8)', $file or die "Cannot write $file: $!\n";
  print {$out} $html;
  close $out;
  print "$file\n";
}

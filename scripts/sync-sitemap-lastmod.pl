#!/usr/bin/env perl

use strict;
use warnings;
use File::Find;
use File::Spec;

my $check_only = @ARGV && $ARGV[0] eq '--check';
die "Usage: $0 [--check]\n" if @ARGV > 1 || (@ARGV && !$check_only);

my $root = File::Spec->rel2abs(File::Spec->catdir(File::Spec->curdir()));
my $sitemap_file = File::Spec->catfile($root, 'sitemap.xml');

open my $in, '<:encoding(UTF-8)', $sitemap_file or die "Cannot read $sitemap_file: $!\n";
local $/;
my $sitemap = <$in>;
close $in;

my %sitemap_routes;
while ($sitemap =~ m{<loc>https://pointvernon\.com(/[^<]*)</loc>}g) {
  $sitemap_routes{$1} = 1;
}

my @page_files;
find(
  {
    no_chdir => 1,
    wanted => sub {
      return if $File::Find::name =~ m{/\.git(?:/|$)};
      return unless $_ eq File::Spec->catfile($File::Find::dir, 'index.html');
      push @page_files, $File::Find::name;
    }
  },
  $root
);

my %page_routes;
for my $file (@page_files) {
  my $relative = File::Spec->abs2rel($file, $root);
  $relative =~ s{\\}{/}g;
  my $route = $relative eq 'index.html' ? '/' : '/' . $relative;
  $route =~ s{index\.html$}{};
  $page_routes{$route} = $file;
}

my @problems;
for my $route (sort keys %page_routes) {
  push @problems, "Page missing from sitemap: $route" unless $sitemap_routes{$route};
}
for my $route (sort keys %sitemap_routes) {
  push @problems, "Sitemap route has no page: $route" unless $page_routes{$route};
}

my $updated = $sitemap;
for my $route (sort keys %page_routes) {
  open my $page_in, '<:encoding(UTF-8)', $page_routes{$route} or die "Cannot read $page_routes{$route}: $!\n";
  local $/;
  my $html = <$page_in>;
  close $page_in;

  my @dates;
  push @dates, ($html =~ /"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"/g);
  push @dates, ($html =~ /<time\b[^>]*\bdatetime="(\d{4}-\d{2}-\d{2})"/g);
  @dates = sort @dates;
  if (!@dates) {
    push @problems, "No modification date found in $page_routes{$route}";
    next;
  }
  my $expected = $dates[-1];
  my $quoted_route = quotemeta($route);
  my $matched = ($updated =~ s{(<url><loc>https://pointvernon\.com$quoted_route</loc><lastmod>)\d{4}-\d{2}-\d{2}(</lastmod></url>)}{$1$expected$2});
  push @problems, "Could not update sitemap entry for $route" unless $matched;
}

if (@problems) {
  print STDERR join("\n", @problems), "\n";
  exit 1;
}

if ($updated eq $sitemap) {
  print "Sitemap dates match all page dates.\n";
  exit 0;
}

if ($check_only) {
  print STDERR "Sitemap dates do not match the page modification dates. Run $0 to update them.\n";
  exit 1;
}

open my $out, '>:encoding(UTF-8)', $sitemap_file or die "Cannot write $sitemap_file: $!\n";
print {$out} $updated;
close $out;
print "Updated sitemap dates from each page's modification date.\n";

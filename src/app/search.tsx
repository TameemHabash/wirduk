import { Redirect } from 'expo-router';

/** `wirduk://search`: the Adhkar tab with the search box ready (redesign). */
export default function SearchLink() {
  return <Redirect href={{ pathname: '/adhkar', params: { focus: 'search' } }} />;
}

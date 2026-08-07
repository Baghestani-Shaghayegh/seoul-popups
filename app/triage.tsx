import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { colors } from '@/constants/theme';
import { useTriage, type TriageCandidate } from '@/hooks/useTriage';

const CATEGORIES = ['Fashion', 'Beauty', 'Food', 'Art', 'Lifestyle'] as const;

/** The two failures that are expected rather than broken, said in English. */
const ERROR_COPY: Record<string, string> = {
  not_signed_in: 'Sign in first — triage needs an admin account.',
  not_admin: 'This account is not an admin, so the queue stays closed.',
};

/**
 * Instagram's own embed URL for a post.
 *
 * This is the ONLY way the app touches Instagram. instagram.com/robots.txt is
 * `Disallow: /`, so nothing here or on the server fetches it — a WebView
 * pointing at /embed is the device displaying Instagram's official embed, which
 * is what that endpoint is published for. It renders the real photo and the
 * full caption, which is where the run dates almost always are.
 *
 * Only post permalinks (/p/<code>) embed. A profile link (/brandname) has no
 * single post to show, so it stays a plain "open" link.
 */
function instagramEmbed(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
  return m ? `https://www.instagram.com/p/${m[1]}/embed/captioned/` : null;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View className="flex-1">
      <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`rounded-2xl border border-line-strong bg-surface px-3 text-base text-ink ${
          multiline ? 'h-28 py-3' : 'h-12'
        }`}
      />
    </View>
  );
}

function CandidateCard({
  c,
  onReject,
  onPublish,
}: {
  c: TriageCandidate;
  onReject: (id: string) => Promise<void>;
  onPublish: (
    id: string,
    input: {
      name: string;
      tagline: string;
      description: string;
      category: string;
      start_date: string | null;
      end_date: string | null;
      image_url?: string | null;
    },
  ) => Promise<void>;
}) {
  const [name, setName] = useState(c.title);
  const [start, setStart] = useState(c.extracted_start ?? '');
  const [end, setEnd] = useState(c.extracted_end ?? '');
  const [category, setCategory] = useState<string | null>(null);
  const [image, setImage] = useState(c.og_image_url ?? '');
  // draft-candidate REJECTS a publish missing any of tagline / description /
  // category, so these are required here rather than optional extras.
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState(c.excerpt ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const embed = instagramEmbed(c.url);

  const publish = async () => {
    if (!name.trim()) return setErr('Name is required');
    if (!tagline.trim()) return setErr('Tagline is required');
    if (!description.trim()) return setErr('Description is required');
    if (!category) return setErr('Pick a category');
    if (!start || !end) return setErr('Both dates are required to publish');
    setBusy(true);
    setErr(null);
    try {
      await onPublish(c.id, {
        name: name.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        category,
        start_date: start,
        end_date: end,
        image_url: image.trim() || null,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setBusy(false);
    }
  };

  const reject = () => {
    Alert.alert('Reject this candidate?', name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () => {
          void onReject(c.id);
        },
      },
    ]);
  };

  return (
    <View className="mb-4 overflow-hidden rounded-3xl border border-line bg-surface">
      <View className="px-4 pb-3 pt-4">
        <View className="flex-row items-start justify-between gap-3">
          <Text className="flex-1 text-lg font-bold text-ink">{c.title}</Text>
          <View className="rounded-full bg-brand-light px-2.5 py-1">
            <Text className="text-xs font-bold text-brand">{c.score}</Text>
          </View>
        </View>

        {c.detected_category ? (
          <Text className="mt-1 text-xs text-muted">
            {c.detected_category}
          </Text>
        ) : null}

        {c.detected_address ? (
          <Text className="mt-2 text-sm text-muted">
            {c.detected_address}
          </Text>
        ) : null}

        <View className="mt-2 flex-row flex-wrap gap-1.5">
          {c.detected_neighborhood ? (
            <Text className="rounded-full bg-purple-light px-2 py-0.5 text-xs text-purple">
              {c.detected_neighborhood}
            </Text>
          ) : null}
          {c.detected_latitude ? (
            <Text className="rounded-full bg-bg px-2 py-0.5 text-xs text-muted">
              pin ✓
            </Text>
          ) : null}
          {c.venue_name ? (
            <Text className="rounded-full bg-bg px-2 py-0.5 text-xs text-muted">
              {c.venue_name}
            </Text>
          ) : null}
        </View>
      </View>

      {/* The source. An IG post embeds inline so the caption — and the dates —
          are readable without leaving the app. Anything else opens outward. */}
      {embed ? (
        <View className="h-[420px] w-full bg-bg">
          <WebView
            source={{ uri: embed }}
            style={{ flex: 1, backgroundColor: 'transparent' }}
            scrollEnabled
            nestedScrollEnabled
            javaScriptEnabled
            domStorageEnabled
          />
        </View>
      ) : null}

      <Pressable
        onPress={() => void Linking.openURL(c.url)}
        className="mx-4 mb-3 mt-3 h-11 flex-row items-center justify-center gap-2 rounded-2xl border border-line-strong"
      >
        <Ionicons name="open-outline" size={16} color={colors.muted} />
        <Text className="text-sm font-semibold text-muted">
          Open source page
        </Text>
      </Pressable>

      {c.date_evidence ? (
        <Text className="mx-4 mb-2 text-xs text-purple">
          found on page: “{c.date_evidence}”
        </Text>
      ) : null}

      {/* enrich-candidates already knows why a field is blank; saying so beats
          leaving an empty box that looks like an oversight. */}
      {(c.extract_notes ?? []).includes('end_only_no_start_stated') ? (
        <Text className="mx-4 mb-2 text-xs text-muted">
          The source only gave an end date — no start to read.
        </Text>
      ) : null}
      {(c.extract_notes ?? []).includes('article_year_unresolved') ? (
        <Text className="mx-4 mb-2 text-xs text-muted">
          The dates on the page state no year, and the page has no publish date
          — so they were left blank rather than guessed.
        </Text>
      ) : null}
      {(c.extract_notes ?? []).includes(
        'weekday_mismatch_year_unreliable',
      ) ? (
        <Text className="mx-4 mb-2 text-xs text-brand">
          The weekday on the page disagrees with the date — check it before
          publishing.
        </Text>
      ) : null}

      {/* What the source page actually says. Already stored at enrich time —
          showing it saves opening the link just to write the description. */}
      {c.excerpt ? (
        <Text className="mx-4 mb-3 text-sm leading-5 text-muted">
          {c.excerpt}
        </Text>
      ) : null}

      <View className="px-4 pb-4">
        <View className="mb-3">
          <Field label="Name" value={name} onChangeText={setName} />
        </View>

        <View className="mb-3">
          <Field
            label="Tagline"
            value={tagline}
            onChangeText={setTagline}
            placeholder="One line a visitor would read"
          />
        </View>

        <View className="mb-3">
          <Field
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        <View className="mb-3 flex-row gap-3">
          <Field
            label="Starts"
            value={start}
            onChangeText={setStart}
            placeholder="YYYY-MM-DD"
          />
          <Field
            label="Ends"
            value={end}
            onChangeText={setEnd}
            placeholder="YYYY-MM-DD"
          />
        </View>

        <View className="mb-3">
          <Field
            label="Photo URL"
            value={image}
            onChangeText={setImage}
            placeholder="https://brand.com/press/popup.jpg"
          />
          <Text className="mt-1.5 text-xs text-muted">
            The brand&apos;s own asset. It is downloaded into your bucket on
            publish, so it never hot-links — but that also means only paste one
            you have the right to republish.
          </Text>
        </View>

        <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          Category
        </Text>
        <View className="mb-3 flex-row flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const on = category === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setCategory(on ? null : cat)}
                className={`rounded-full border px-3 py-1.5 ${
                  on ? 'border-brand bg-brand' : 'border-line-strong bg-surface'
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${on ? 'text-white' : 'text-muted'}`}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {err ? <Text className="mb-2 text-sm text-brand">{err}</Text> : null}

        <View className="flex-row gap-3">
          <Pressable
            onPress={reject}
            className="h-14 flex-1 items-center justify-center rounded-2xl border border-line-strong"
          >
            <Text className="font-semibold text-muted">Reject</Text>
          </Pressable>
          <Pressable
            onPress={() => void publish()}
            disabled={busy}
            className="h-14 flex-[2] flex-row items-center justify-center rounded-2xl bg-brand"
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="font-bold text-white">Publish as draft</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/**
 * Triage — the discovery queue's only reader.
 *
 * Unlisted on purpose: no tab, no link from anywhere in the app. Reaching it
 * means typing /triage, and even then the queue is empty for anyone who is not
 * in public.admins, because the gate is in the Edge Function rather than here.
 */
export default function TriageScreen() {
  const insets = useSafeAreaInsets();
  const { candidates, loading, error, refresh, reject, publish } = useTriage();

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{
        padding: 16,
        paddingBottom: insets.bottom + 32,
      }}
    >
      {loading ? (
        <View className="items-center py-16">
          <ActivityIndicator color={colors.brand.DEFAULT} />
        </View>
      ) : error ? (
        <View className="items-center py-16">
          <Text className="text-center text-muted">
            {ERROR_COPY[error] ?? error}
          </Text>
          <Pressable
            onPress={() => void refresh()}
            className="mt-4 h-12 items-center justify-center rounded-2xl bg-brand px-6"
          >
            <Text className="font-bold text-white">Try again</Text>
          </Pressable>
        </View>
      ) : candidates.length === 0 ? (
        <View className="items-center py-16">
          <Text className="text-center text-muted">
            Nothing waiting. Discovery adds candidates as it finds them.
          </Text>
        </View>
      ) : (
        <>
          <Text className="mb-3 text-sm text-muted">
            {candidates.length} waiting
          </Text>
          {candidates.map((c) => (
            <CandidateCard
              key={c.id}
              c={c}
              onReject={reject}
              onPublish={publish}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
}

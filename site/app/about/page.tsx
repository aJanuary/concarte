import { useTranslations } from "next-intl";
import config from "@/generated/config";
import Markdown from "react-markdown";
import Link from "next/link";
import type { Components } from "react-markdown";
import { getTranslations } from "next-intl/server";
import { eventDescription, named, previewMetadata } from "../page-meta";
import { pageTranslator } from "../page-translator";

export async function generateMetadata() {
  const about = await getTranslations("about");
  const t = await pageTranslator();
  return previewMetadata(config, {
    title: named(config, t, about("title")),
    description: eventDescription(config, t),
    path: "/about",
  });
}

export default function About() {
  const t = useTranslations("about");

  const markdownComponents: Components = {
    a: ({ href, children, ...props }) => {
      // Use Next.js Link for internal links, regular <a> for external
      if (href && href.startsWith("/")) {
        return (
          <Link href={href} {...props}>
            {children}
          </Link>
        );
      }
      return (
        <a href={href} {...props}>
          {children}
        </a>
      );
    },
  };

  let attributions = <></>;
  if (config.attributions) {
    attributions = (
      <>
        <p>{t("attribution-heading")}</p>
        <ul className="list-disc">
          {config.attributions.map((attribution, i) => (
            <li key={i}>
              <Markdown components={markdownComponents}>{attribution}</Markdown>
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <main className="prose prose-default mx-auto p-4 pt-12">
      <p>
        <Link href="/">← {t("back")}</Link>
      </p>
      <h1>{t("title")}</h1>
      <Markdown components={markdownComponents}>{config.description}</Markdown>
      <p className="border-border border-t-2 pt-4">
        {t.rich("powered-by", {
          GitHubLink: () => (
            <a href="https://github.com/aJanuary/concarte/">ConCarte</a>
          ),
        })}
      </p>
      {attributions}
    </main>
  );
}

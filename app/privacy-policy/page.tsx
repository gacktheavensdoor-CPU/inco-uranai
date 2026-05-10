export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-teal-100 p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-emerald-800 mb-6">プライバシーポリシー</h1>

        <p className="text-sm text-gray-500 mb-6">最終更新日：2026年5月10日</p>

        <section className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-2">1. はじめに</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            インコ占い（以下「本サービス」）は、ユーザーのプライバシーを尊重し、個人情報の保護に努めます。
            本ポリシーは、本サービスにおける情報の収集・利用方針について説明します。
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-2">2. 収集する情報</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            本サービスでは、診断の回答内容（質問への選択肢）をAPIリクエストの処理のために一時的に使用します。
            これらの情報はサーバー上に保存されず、診断結果の生成後に破棄されます。
            氏名・メールアドレス等の個人を特定できる情報は収集しません。
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-2">3. 第三者サービスへの情報送信</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            診断結果の生成にあたり、回答内容をAnthropic社（米国）のAI API（Claude）に送信します。
            送信される情報は診断の選択肢のみであり、個人を特定できる情報は含まれません。
            Anthropic社のプライバシーポリシーは
            <a href="https://www.anthropic.com/privacy" className="text-emerald-600 hover:underline" target="_blank" rel="noopener noreferrer">こちら</a>
            をご確認ください。
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-2">4. Cookieおよびアクセス解析</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            本サービスでは、Google AdSenseおよびGoogle Analyticsを利用する場合があります。
            これらのサービスはCookieを使用してアクセス情報を収集します。
            収集された情報は広告配信の最適化および利用状況の分析に使用されます。
            Cookieの無効化はブラウザの設定から行えます。
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-2">5. 広告について</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            本サービスはGoogle AdSenseを利用した広告を掲載する場合があります。
            Googleはユーザーの興味に基づいた広告を表示するためにCookieを使用することがあります。
            詳細はGoogleの<a href="https://policies.google.com/privacy" className="text-emerald-600 hover:underline" target="_blank" rel="noopener noreferrer">プライバシーポリシー</a>をご確認ください。
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-2">6. アフィリエイトリンクについて</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            本サービスはAmazonアソシエイト・プログラムに参加しており、
            商品リンクを通じてご購入いただいた場合に紹介料を受け取ることがあります。
            該当リンクには「広告」または「Amazon →」と表記しています。
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-2">7. 第三者への情報提供</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            収集した情報は、法令に基づく場合および上記3項に記載の場合を除き、第三者に提供しません。
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-2">8. お問い合わせ</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            本ポリシーに関するお問い合わせは、YouTubeチャンネルのコメント欄またはコミュニティよりご連絡ください。
          </p>
        </section>

        <div className="mt-8 text-center">
          <a href="/" className="text-emerald-600 hover:underline text-sm">← トップに戻る</a>
        </div>
      </div>
    </main>
  );
}

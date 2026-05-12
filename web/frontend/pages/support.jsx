import {
    Card, Page, Layout,  Heading, MediaCard,  Button,  Icon, Frame,
    TopBar
} from "@shopify/polaris";
import {
    HomeMajor, ChecklistMajor, QuestionMarkMajor, CashDollarMajor
} from '@shopify/polaris-icons';
import { useState, useCallback } from 'react';
import { FAQ } from "../components/FAQ";
import { useNavigate } from "react-router-dom";


export default function Support() {

    const [open, setOpen] = useState(true);

    const handleToggle = useCallback(() => setOpen((open) => !open), []);

    const q1 = "Where can I use this application?"
    const a1 = "You can use this application on any product page."

    const q2 = "Is this app compatable with my theme ? How do I check ?"
    const a2 = "Our app is 2.0 compatable. No matter which theme you are using but it must be 2.0 theme."

    const q3 = "Is there any speed or performance related issue with this app ?"
    const a3 = "No, we love performance. Our application is highly optimized, fast, and lightweight."

    const q4 = "Does the app supports non 2.0 themes ?"
    const a4 = "No, for the time being, the app doesn't support non-2.0 themes."

    const q5 = "Can I connect multiple products in single image ?"
    const a5 = "Yes, you can connect upto 5 products in a single image."

    const q6 = "Can I customize the color,heading or image ?"
    const a6 = "Yes, you can customize your layout and color according to your requirements. In case of any queries, please feel free to contact us at: info@meroxio.com"

    const q7 = "Is this application compatible with all browser and IOS device ?"
    const a7 = "Yes, we made sure that our application supports all browsers and devices."

    const q8 = "What are the differnet use cases for this app?"
    const a8 = "You can use it with multiple ways like Similar products, Pair it with, Product recommendations, Buy it with"


    const mediaCardDesc = <span>Relax and unwind, we are here to help. Please feel free to contact us at: <br></br><strong>support@meroxio.com</strong></span>;

    const navigate = useNavigate();

    const logo = {

        width: 450,
        height: 90,
        topBarSource:
            `https://cdn.shopify.com/s/files/1/0629/5522/5264/files/MeroxIO_Comparison_Slider.png?v=1702290807`,
        url: '/',
        accessibilityLabel: 'https://cdn.shopify.com/s/files/1/0627/5727/3793/files/lookbook_logo.png?v=1666164778',
    };
    const gotoHomePage = () => {
        navigate("/");
    }

    const gotoInstallPage = () => {
        navigate("/install");

    }

    const gotoSupportPage = () => {
        navigate("/support");
    }

    const gotoPricingPage = () => {
        navigate("/pricing");
    }

    const secondaryMenuMarkup = (
        <TopBar.Menu
            activatorContent={
                <div className="main-icon">
                    <div className="main-icon-1"><Button onClick={gotoHomePage} plain monochrome removeUnderline fullWidth >
                        <div className="m-icon-show-1"><Icon source={HomeMajor} /><span className="m-hover-text-1"> <h1>Home</h1></span></div></Button>

                    </div>
                </div>
            }

        />
    );

    const topBarMarkup = (
        <TopBar
            secondaryMenu={secondaryMenuMarkup}

        />

    );


    return (

        <Frame topBar={topBarMarkup} logo={logo} >
            <Page>

                <Layout>
                    <Layout.Section>

                        <MediaCard
                            title="Amazing customer support"
                            primaryAction={{
                                content: 'Email Now',
                                onAction: () => {
                                    console.log('clicked')
                                    window.open('mailto:support@meroxio.com')
                                },
                            }}
                            description={mediaCardDesc}

                        >
                            <img
                                alt=""
                                width="100%"
                                height="100%"
                                style={{
                                    objectFit: 'cover',
                                    objectPosition: 'center',
                                }}
                                src="https://cdn.shopify.com/s/files/1/0024/0084/5893/files/Copy_of_hanloy.gif?v=1661494528"
                            />
                        </MediaCard>


                    </Layout.Section>
                </Layout>

                <Layout>
                    <Layout.Section>
                        <Heading id="faqHeading">Frequently Asked Questions</Heading>
                        <div style={{ marginBottom: '40px' }}>
                            <Card>
                                <div className="faq">
                                    <FAQ q={q1} a={a1} />
                                    <FAQ q={q2} a={a2} />
                                    <FAQ q={q3} a={a3} />
                                    <FAQ q={q4} a={a4} />
                                    <FAQ q={q5} a={a5} />
                                    <FAQ q={q6} a={a6} />
                                    <FAQ q={q7} a={a7} />
                                    <FAQ q={q8} a={a8} />
                                </div>
                            </Card>

                        </div>
                    </Layout.Section>
                </Layout>
            </Page>
        </Frame>
    );
}

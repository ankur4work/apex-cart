import {
    Card, Page, Layout, MediaCard, VideoThumbnail, Button, Modal, Icon,
    Frame,
    TopBar
} from "@shopify/polaris";
import { useState, useCallback } from 'react';
import { TitleBar } from "@shopify/app-bridge-react";

import { shopifyBackground } from "../assets";
import {
    HomeMajor, ChecklistMajor, QuestionMarkMajor, CashDollarMajor
} from '@shopify/polaris-icons';
import { useNavigate } from "react-router-dom";
import { AppblockInstallationSteps } from "../components/AppblockInstallationSteps";
import { MetafieldInstallationSteps } from "../components/MetafieldInstallationSteps";
import { Addmetafieldinproducts } from "../components/Addmetafieldinproducts";
import CodeSnippetWithCopy from "../components/CodeSnippetWithCopy";


export default function Installation() {


    const [active, setActive] = useState(false);

    const handleChange = useCallback(() => setActive(!active), [active]);

    function openThemeEditor() {
        window.open("https://" + data?.shop + "/admin/themes/current/editor");
    }

    const navigate = useNavigate();

    const logo = {

        width: 450,
        height: 90,
        topBarSource:
            `https://cdn.shopify.com/s/files/1/0571/4372/2059/files/MeroxIO.png?v=1734519087`,
        url: '/',
        accessibilityLabel: 'https://cdn.shopify.com/s/files/1/0571/4372/2059/files/MeroxIO.png?v=1734519087',
    };

    const gotoHomePage = () => {
        navigate("/");
    }

    const gotoInstallPage = () => {
        navigate("/install");

    }

    const secondaryMenuMarkup = (
        <TopBar.Menu
            activatorContent={
                <div className="main-icon">
                    <div className="main-icon-1"><Button onClick={gotoHomePage} plain monochrome removeUnderline fullWidth >
                        <div className="m-icon-show-1"><Icon source={HomeMajor} /><span className="m-hover-text-1"> <h1>Home</h1></span></div></Button>

                    </div>

                    <div className="main-icon-2"><Button onClick={gotoInstallPage} plain monochrome removeUnderline fullWidth >
                        <div className="m-icon-show-2"><Icon source={ChecklistMajor} /><span className="m-hover-text-2"> <h1>Installation</h1></span></div></Button>

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
            <Page >

                <Layout>
                    <div className="setupCard">
                        <Layout.Section oneHalf>
                            <MediaCard
                                title="Quick setup"
                                primaryAction={{
                                    content: 'Installation Steps',
                                    onAction: () => { handleChange() },
                                }}
                                description="If you're looking to enhance your store's functionality and provide a seamless shopping experience, then adding a Move to Wishlist feature is the perfect way to do it."
                            >
                                <VideoThumbnail
                                    videoLength={120}
                                    thumbnailUrl="https://cdn.shopify.com/s/files/1/0024/0084/5893/files/Copy_of_hanloy_2.gif"
                                    onClick={handleChange}
                                />
                            </MediaCard>

                        </Layout.Section>

                        

                    </div>

                    <CodeSnippetWithCopy/>            

                    {/* <div className="m-carousel-container">
                        <h1 className="m-appblock"><b>App Block Installation Steps</b></h1>
                        <Card>
                            <Layout.Section>
                                <div className="m-image-slider">
                                    <AppblockInstallationSteps
                                        image1="https://cdn.shopify.com/s/files/1/0749/4638/0075/files/1.jpg?v=1686033344"
                                        image2="https://cdn.shopify.com/s/files/1/0749/4638/0075/files/2.jpg?v=1686033345"
                                        image3="https://cdn.shopify.com/s/files/1/0749/4638/0075/files/3.jpg?v=1686033344"
                                        image4="https://cdn.shopify.com/s/files/1/0749/4638/0075/files/4.jpg?v=1686033345"
                                        image5="https://cdn.shopify.com/s/files/1/0749/4638/0075/files/5.jpg?v=1686033344"
                                        image6="https://cdn.shopify.com/s/files/1/0749/4638/0075/files/6.jpg?v=1686033344"
                                        image7="https://cdn.shopify.com/s/files/1/0749/4638/0075/files/7.jpg?v=1686033344"
                                        image8="https://cdn.shopify.com/s/files/1/0749/4638/0075/files/8.jpg?v=1686033344"
                                        image9="https://cdn.shopify.com/s/files/1/0749/4638/0075/files/9.jpg?v=1686033344"
                                        image10="https://cdn.shopify.com/s/files/1/0749/4638/0075/files/10.jpg?v=1686033344"
                                    />
                                </div>
                            </Layout.Section>
                        </Card>


                    </div> */}

                    {/* { <div className="m-carousel-container">
                        <h1 className="m-appblock"><b>Metafield Installation Steps</b></h1>
                        <Card>
                            <Layout.Section>

                                <div className="m-image-slider">

                                    <MetafieldInstallationSteps
                                        image1="https://cdn.shopify.com/s/files/1/0627/5727/3793/files/Screenshot_1.png?v=1669013986"
                                        image2="https://cdn.shopify.com/s/files/1/0627/5727/3793/files/Screenshot_2.png?v=1669013986"
                                        image3="https://cdn.shopify.com/s/files/1/0627/5727/3793/files/Screenshot_3.png?v=1669013986"
                                        image4="https://cdn.shopify.com/s/files/1/0627/5727/3793/files/Screenshot_4.png?v=1669018303"
                                        image5="https://cdn.shopify.com/s/files/1/0627/5727/3793/files/Screenshot_5.png?v=1669018303"
                                        image6="https://cdn.shopify.com/s/files/1/0627/5727/3793/files/Screenshot_6.png?v=1669018303"
                                        image7="https://cdn.shopify.com/s/files/1/0627/5727/3793/files/Screenshot_7.png?v=1669018303"

                                    />
                                </div>
                            </Layout.Section>
                        </Card>
                    </div> } */}

                    {/* { <div className="m-carousel-container">
                        <h1 className="m-appblock"><b>Add Metafield In Products</b></h1>
                        <Card>
                            <Layout.Section>

                                <div className="m-image-slider">
                                    <Addmetafieldinproducts
                                        image1="https://cdn.shopify.com/s/files/1/0627/5727/3793/files/Screenshot_8.png?v=1669018303"
                                        image2="https://cdn.shopify.com/s/files/1/0627/5727/3793/files/Screenshot_9.png?v=1669018304"
                                        image3="https://cdn.shopify.com/s/files/1/0627/5727/3793/files/Screenshot_10.png?v=1669018303"
                                        image4="https://cdn.shopify.com/s/files/1/0627/5727/3793/files/Screenshot_11.png?v=1669018303"
                                        image5="https://cdn.shopify.com/s/files/1/0627/5727/3793/files/Screenshot_12.png?v=1669018303"
                                        image6="https://cdn.shopify.com/s/files/1/0627/5727/3793/files/Screenshot_13.png?v=1669018303"
                                        image7="https://cdn.shopify.com/s/files/1/0627/5727/3793/files/Screenshot_14.png?v=1669018303"
                                        image8="https://cdn.shopify.com/s/files/1/0627/5727/3793/files/Screenshot_15.png?v=1669018303"
                                        image9="https://cdn.shopify.com/s/files/1/0627/5727/3793/files/Screenshot_16.png?v=1669018303"
                                    />
                                </div>
                            </Layout.Section>
                        </Card>
                    </div> } */}
                    <div>
                        <Modal
                            open={active}
                            onClose={handleChange}
                            title="Quick Setup in 2.0 themes"
                        >
                            <Modal.Section>
                                <div style={{ padding: '56% 0 0 0', position: 'relative' }}><iframe src="https://cdn.shopify.com/videos/c/o/v/879c7b0f313e4e858abc5c16733670d3.mp4?portrait=0&loop=1&title=0&byline=0&sidedock=0&h=881b23983c&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479&amp;autoplay=1" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%' }} title="Quick Setup"></iframe></div>
                            </Modal.Section>
                        </Modal>
                    </div>


                </Layout>
            </Page>

        </Frame>
    );
}


